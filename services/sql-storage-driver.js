var _ = require('underscore');
var Q = require('q');
var moment = require('moment');
var crypto = require('crypto');
var mongoose = require('mongoose');
var mongo = mongoose.mongo;
var GridStore = mongo.GridStore;
var ObjectId = mongoose.Types.ObjectId;
require('mongoose-long')(mongoose);
var R = require('ramda');

module.exports = function (dbUrl, injection, dbClient) {
    var service = {};
    var db;
    var onConnectListeners = [];

    var knex = require('knex')({
        client: dbClient,
        connection: dbUrl,
        pool: {
            afterCreate: function (connection, callback) {
                if (db) {
                    callback(null, connection);
                }
                db = true;
                return onConnectListeners.map(function (listener) { return function () { return listener() }}).reduce(Q.when, Q(null)).thenResolve(connection).nodeify(callback);
            }
        }
    });

    service.addOnConnectListener = function (listener) {
        if (db) {
            Q(listener()).done();
        } else {
            onConnectListeners.push(listener);
        }
    };

    var entityTypeIdToTable = {};

    service.setupModel = function (table) {
        entityTypeIdToTable[table.entityTypeId] = table;
    };

    service.findCount = function (table, filteringAndSorting) {
        var where = queryFor(table, filteringAndSorting);
        return Q(where(knex(table.tableName)).count('id as count')).then(function (result) {
            return result[0].count;
        });
    };

    service.findQuery = function (table, filteringAndSorting) {
        var where = queryFor(table, filteringAndSorting);
        var order = sortingFor(filteringAndSorting, table.fields);
        var joins = referenceJoins(table);
        var select = selectFields(table);
        return R.compose(where, order, joins, select);
    };

    service.findAll = function (table, filteringAndSorting) {
        var query = this.findQuery(table, filteringAndSorting);
        return Q(query(knex(table.tableName)))
            .then(function (result) { return result.map(fromBson(table.fields)) });
    };

    service.findRange = function (table, filteringAndSorting, start, count) {
        var query = this.findQuery(table, filteringAndSorting);
        return Q(query(knex(table.tableName)).limit(parseInt(count)).offset(parseInt(start)))
            .then(function (result) {
                return result.map(fromBson(table.fields))
            });
    };

    service.checkUserPassword = function (table, entityId, passwordField, password) {
        if (!entityId) {
            throw new Error('entityId should be defined for checkUserPassword()');
        }
        return Q(knex(table.tableName).where('id', entityId)).then(function (user) {
            user = user[0];
            if (!user) {
                return false;
            }
            var salt = user.passwordHash.split('.')[0];
            var digest = service.passwordHash(salt, password);
            return digest === user.passwordHash ? fromBson(table.fields)(user) : false;
        });
    };

    function sortingFor(filteringAndSorting, fields) {
        return function (query) {
            _.forEach(_.object(_.union(filteringAndSorting && filteringAndSorting.sorting && filteringAndSorting.sorting.filter(function (i) { return !!fields[i[0]]}) || [], [['modifyTime', -1]])), function (dir, field) {
                query = query.orderBy(field, dir > 0 ? 'asc' : 'desc');
            });
            return query;
        };
    }

    var systemFields = {
        createTime: {
            fieldType: {
                id: 'date'
            }
        },
        modifyTime: {
            fieldType: {
                id: 'date'
            }
        }
    };

    function getAllFields(table) {
        return _.extend({}, table.fields, systemFields);
    }

    function queryFor(table, filteringAndSorting) {
        return function (query) {
            if (filteringAndSorting) {
                if (filteringAndSorting.query) {
                    //query = _.clone(filteringAndSorting.query); //TODO
                }
                if (filteringAndSorting.textSearch) {
                    var split = splitText(filteringAndSorting.textSearch);
                    /*if (split.length > 0) { //TODO
                     query.$and = split.map(function (value) { return {__textIndex: { $regex: value + ".*" }}});
                     }*/
                }
                if (filteringAndSorting.filtering) {
                    var allFields = getAllFields(table);
                    _.each(allFields, function (field, fieldName) {
                        if (_.isUndefined(filteringAndSorting.filtering[fieldName])) {
                            return;
                        }
                        var filterValue = filteringAndSorting.filtering[fieldName];
                        if (field.fieldType.id == 'reference') {
                            query = query.where(fieldName, filteringAndSorting.filtering[fieldName]);
                        } else if (field.fieldType.id == 'checkbox') {
                            query = query.where(fieldName, filteringAndSorting.filtering[fieldName]); /// TODO: ? filteringAndSorting.filtering[fieldName] : {$in: [false, null]};
                        } else if (field.fieldType.id == 'date') {
                            if (filterValue.op === 'gt') {
                                query = query.where(fieldName, '>', filteringAndSorting.filtering[fieldName]); //TODO convert from string?
                            } else if (filterValue.op === 'lt') {
                                query = query.where(fieldName, '<', filteringAndSorting.filtering[fieldName]); //TODO convert from string?
                            } else {
                                query = query.where(fieldName, filteringAndSorting.filtering[fieldName]);
                            }
                        } else if (field.fieldType.id == 'text') {
                            if (filterValue.op === 'startsWith') {
                                query = query.where(fieldName, 'like', filterValue.value + "%");
                            } else if (filterValue.op === 'in') {
                                query = query.whereIn(fieldName, filterValue.value);
                            } else {
                                query = query.where(fieldName, filterValue);
                            }
                        } else {
                            query = query.where(fieldName, filteringAndSorting.filtering[fieldName]);
                        }
                    });
                }
            }
            return query;
        }
    }

    function referenceJoins(table) {
        return function (query) {
            var allFields = getAllFields(table);
            _.each(allFields, function (field, fieldName) {
                if (field.fieldType.id == 'reference') {
                    var referenceTable = entityTypeIdToTable[field.fieldType.referenceEntityTypeId];
                    var referenceTableName = referenceTable.tableName;
                    query = query.leftOuterJoin(referenceTableName, table.tableName + '.' + fieldName, referenceTableName + '.id')
                        .select(referenceTable.fieldsToSelectForReferenceName.map(function (n) { return referenceTableName + '.' + n + ' as ' + fieldName + '_' + n}));
                }
            });
            return query;
        }
    }

    function selectFields(table) {
        return function (query) {
            return query.select(table.tableName + '.*');
        }
    }

    service.queryFor = queryFor;

    service.newEntityId = function () {
        return (new ObjectId()).toString();
    };

    service.createEntity = function (table, entity) {
        return callBeforeCrudListeners(table, null, entity).then(function () {
            var toInsert = toBson(table.fields)(entity);
            toInsert.createTime = new Date();
            toInsert.modifyTime = new Date();
            setAuxiliaryFields(table.fields, toInsert, toInsert);
            return Q(knex(table.tableName).insert(toInsert, 'id'))
                .then(callAfterCrudListeners(table, null, fromBson(table.fields)(toInsert)))
                .then(function (result) {
                    return result[0];
                });
        });

    };

    service.aggregateQuery = function (table, aggregatePipeline) { //TODO
        var collection = db.collection(table.tableName);
        return Q.nfbind(collection.aggregate.bind(collection))(aggregatePipeline).then(function (rows) {
            return rows.map(function (row) {
                return _.extend(row,  fromBson(table.fields)(row));
            });
        })
    };

    function padId(id) {
        return id.length < 12 ? _.range(0, 12 - id.length).map(function () {return " "}).join("") + id : id;
    }

    function toMongoId(entityId) {
        return new ObjectId(padId(entityId));
    }

    service.readEntity = function (table, entityId) {
        if (!entityId) {
            throw new Error('entityId should be defined for readEntity()');
        }
        return Q(knex(table.tableName).where('id', entityId)).then(function (result) {
            result = result[0];
            return result && fromBson(table.fields)(result) || result;
        });
    };

    service.updateEntity = function (table, entity) {
        return service.readEntity(table, entity.id).then(function (oldEntity) {
            var newEntity = _.extend(Object.create(oldEntity), entity);
            return callBeforeCrudListeners(table, oldEntity, newEntity).then(function () {
                var toUpdate = toBson(table.fields)(_.extendOwn({}, newEntity));
                toUpdate.modifyTime = new Date();
                return Q(knex(table.tableName).where('id', entity.id).update(toUpdate))
                    .then(callAfterCrudListeners(table, oldEntity, newEntity)) //TODO REST layer should convert all data types
                    .then(function () {
                        return service.readEntity(table, entity.id).then(function (result) {
                            var update = {};
                            setAuxiliaryFields(table.fields, result, update);
                            if (_.size(update)) {
                                return Q(knex(table.tableName).where('id', entity.id).update(update)).thenResolve(result);
                            } else {
                                return result;
                            }
                        });
                    });
            });
        });
    };

    service.deleteEntity = function (table, entityId) {
        return service.readEntity(table, entityId).then(function (oldEntity) {
            return callBeforeCrudListeners(table, oldEntity, null).then(function () {
                return Q(knex(table.tableName).where('id', entityId).del()).then(callAfterCrudListeners(table, oldEntity, null));
            });
        })
    };

    function callAfterCrudListeners(table, oldEntity, newEntity) {
        return function (result) {
            return invokeCrudListeners(table.tableName, afterCrudListeners[table.tableName], oldEntity, newEntity).thenResolve(result);
        }
    }

    function callBeforeCrudListeners(table, oldEntity, newEntity) {
        return invokeCrudListeners(table.tableName, beforeCrudListeners[table.tableName], oldEntity, newEntity);
    }

    function invokeCrudListeners(tableName, listenerArray, oldEntity, newEntity) {
        if (injection.inject('inCrudListener_' + tableName, true)) {
            return Q(null);
        }
        return (listenerArray || []).map(function (listener) {
            return function () {
                var scope = {};
                scope['inCrudListener_' + tableName] = true;
                return injection.inScope(scope, function () {
                    return listener(oldEntity, newEntity)
                });
            }
        }).reduce(Q.when, Q(null));
    }

    function setAuxiliaryFields(fields, entity, toUpdate) {
        //setTextIndex(fields, entity, toUpdate);
    }

    function setTextIndex(fields, entity, toUpdate) { //TODO
        var strings = convertEntity(fields, function (value, field) {
            if (field.fieldType.id == 'reference' && value) {
                return value.name && value.name.toString() || undefined;
            }
            return value && value.toString() || undefined;
        }, entity);
        toUpdate.__textIndex = _.chain(strings).map(splitText).flatten().unique().value();
    }

    function splitText(str) {
        return _.filter(str.toLowerCase().split(/\s/), function (str) {
            return str.trim().length > 0;
        });
    }

    function fromBson(fields) {
        return function (entity) {
            var result = convertEntity(fields, fromBsonValue, entity);
            if (entity.id) {
                result.id = entity.id.toString();
            }
            return result;
        }
    }

    service.fromBson = fromBson;

    function toBson(fields) { //TODO it doesn't convert id
        return function (entity) {
            return convertEntity(fields, toBsonValue, entity);
        }
    }

    function convertEntity(fields, convertFun, entity) {
        var result = {};
        _.each(fields, function (field, fieldName) {
            var value = convertFun(entity[fieldName], field, entity, fieldName);
            if (value && (value.$$push || value.$$pull)) {
                var mergeOp = value.$$push || value.$$pull;
                if (!result[mergeOp.field] || !_.isArray(result[mergeOp.field])) {
                    result[mergeOp.field] = [];
                }
                if (value.$$push && !_.contains(result[mergeOp.field], mergeOp.value)) {
                    result[mergeOp.field].push(mergeOp.value);
                } else if (value.$$pull && _.contains(result[mergeOp.field], mergeOp.value)) {
                    result[mergeOp.field].splice(result[mergeOp.field].indexOf(mergeOp.value), 1);
                }
            } else if (!_.isUndefined(value)) {
                result[fieldName] = value;
            }
        });
        return result;
    }

    function fromBsonValue(value, field, entity, fieldName) {
        if (field.fieldType.id == 'date' && value) {
            return moment(value).format('YYYY-MM-DD'); //TODO move to REST layer?
        } else if (field.fieldType.id == 'money' && value) {
            return value.toString(10).replace(/\./, '');
        } /*else if (field.fieldType.id == 'checkbox' && field.fieldType.storeAsArrayField) { //TODO
            return entity[field.fieldType.storeAsArrayField] &&
                _.isArray(entity[field.fieldType.storeAsArrayField]) &&
                entity[field.fieldType.storeAsArrayField].indexOf(field.name) != -1
        }*/ else if (field.fieldType.id == 'password') {
            return '';
        } else if (field.fieldType.id == 'reference' && value) {
            var referenceTable = entityTypeIdToTable[field.fieldType.referenceEntityTypeId];
            var reference = _.chain(referenceTable.fieldsToSelectForReferenceName).map(function (n) { return [n, entity[fieldName + '_' + n]] }).object().value();
            return {id: value, name: referenceTable.referenceName(reference) };
        }
        return value;
    }

    function toBsonValue(value, field, entity, fieldName) {
        if (field.fieldType.id == 'date' && value) {
            if (_.isDate(value)) {
                return value;
            }
            return moment(value, 'YYYY-MM-DD').toDate(); //TODO move to REST layer?
        } else if (field.fieldType.id == 'reference' && value) {
            if (!value.id) {
                throw new Error("Reference value without id was passed for field '" + fieldName + "'");
            }
            return value.id
        } else if (field.fieldType.id == 'money' && value) {
            return value.toString().slice(0, -2) + '.' + value.toString().slice(-2)
        } /*else if (field.fieldType.id == 'checkbox' && field.fieldType.storeAsArrayField && !_.isUndefined(value)) { //TODO
            return value ? {
                $$push: {
                    field: field.fieldType.storeAsArrayField,
                    value: field.name
                }
            } : {
                $$pull: {
                    field: field.fieldType.storeAsArrayField,
                    value: field.name
                }
            };
        }*/ else if (field.fieldType.id == 'password' && value) {
            return service.passwordHash(crypto.randomBytes(16).toString('hex'), value);
        }
        return value;
    }

    service.passwordHash = function (salt, password) {
        var hash = crypto.createHmac('sha1', salt.toString());
        hash.update(password, 'utf8');
        return salt + '.' + hash.digest('hex');
    };

    service.createFile = function (fileName, readableStream) {
        var fileId = new ObjectId();
        var gridStore = new GridStore(db, fileId, fileName, "w");
        var open = Q.nfbind(gridStore.open.bind(gridStore));
        return open().then(function (store) {
            var write = Q.nfbind(store.write.bind(store));
            var writeChain = Q(null);
            readableStream.on('data', function (chunk) {
                writeChain = writeChain.then(function () {
                    return write(chunk);
                });
            });
            var deferredEnd = Q.defer();
            readableStream.on('end', function () {
                writeChain.then(function (store) {
                    var close = Q.nfbind(store.close.bind(store));
                    return close().then(function () {
                        deferredEnd.resolve(fileId);
                    }, function (err) {
                        deferredEnd.reject(err);
                    });
                })
            });
            readableStream.on('error', function (err) {
                deferredEnd.reject(err);
            });
            return deferredEnd.promise;
        });
    };

    service.getFile = function (fileId) {
        var gridStore = new GridStore(db, toMongoId(fileId), "r");
        var open = Q.nfbind(gridStore.open.bind(gridStore));
        return open().then(function (store) {
            return {fileName: store.filename, stream: store.stream(true)};
        });
    };

    service.removeFile = function (fileId) { //TODO enable file removing when file owning security checks will be ready
        var gridStore = new GridStore(db, toMongoId(fileId), "r");
        return Q.nfbind(gridStore.unlink.bind(gridStore))();
    };

    var afterCrudListeners = {};
    var beforeCrudListeners = {};

    //TODO addEntityListener -- deprecated
    service.addEntityListener = service.addAfterCrudListener = function (table, listener) {
        addCrudListener(afterCrudListeners, table, listener);
    };

    service.addBeforeCrudListener = function (table, listener) {
        addCrudListener(beforeCrudListeners, table, listener);
    };

    function addCrudListener(listeners, table, listener) {
        if (!listeners[table.tableName]) {
            listeners[table.tableName] = [];
        }
        listeners[table.tableName].push(listener);
    }

    service.closeConnection = function () {
        var defer = Q.defer();
        service.addOnConnectListener(function () {
            connection.close(function () {
                defer.resolve(null);
            });
        });
        return defer.promise;
    };

    return service;
};