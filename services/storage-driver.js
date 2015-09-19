var _ = require('underscore');
var Q = require('q');
var moment = require('moment');
var crypto = require('crypto');
var mongoose = require('mongoose');
var mongo = mongoose.mongo;
var GridStore = mongo.GridStore;
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;
require('mongoose-long')(mongoose);

module.exports = function (dbUrl, injection, appUtil) {
    var service = {};
    var db;
    var onConnectListeners = [];
    var models = {};

    var connection = mongoose.createConnection(dbUrl);

    connection.on('connected', function () {
        db = connection.db;
        onConnectListeners.map(function (listener) { return function () { return listener() }}).reduce(Q.when, Q(null));
    });

    function toPromise(query, method) {
        var deferred = Q.defer();
        query[method](function (err, result) {
            if (err) {
                deferred.reject(new Error(err));
            } else {
                deferred.resolve(result);
            }
        });
        return deferred.promise;
    }

    function deferredCallback(deferred) {
        return function (err, result) {
            if (err) {
                deferred.reject(new Error(err));
            } else {
                deferred.resolve(result);
            }
        }
    }

    service.addOnConnectListener = function (listener) {
        if (db) {
            listener();
        } else {
            onConnectListeners.push(listener);
        }
    };

    service.mongooseConnection = function () {
        return connection;
    };

    function modelFor(table) {
        if (models[table.entityTypeId]) {
            return models[table.entityTypeId];
        }
        var definition = _.chain(getAllFields(table)).map(function (field, fieldName) {
            if (field.fieldType.notPersisted) {
                return undefined;
            }
            var fieldType;
            if (field.fieldType.id === 'date') {
                fieldType = Date;
            } else if (field.fieldType.id === 'reference') {
                fieldType = {id: Schema.ObjectId, name: String};
            } else if (field.fieldType.id === 'attachment') {
                fieldType = {}; // allow to save attachments in different storage providers
            } else if (field.fieldType.id === 'integer') {
                fieldType = Number;
            } else if (field.fieldType.id === 'money') {
                fieldType = Schema.Types.Long;
            } else if (field.fieldType.id === 'checkbox') {
                if (field.fieldType.storeAsArrayField) {
                    return [field.fieldType.storeAsArrayField, [String]];
                } else {
                    fieldType = Boolean;
                }
            } else {
                fieldType = String;
            }
            if (field.isUnique) {
                fieldType = {type: fieldType, index: { unique: true }};
            }
            return [fieldName, fieldType];
        }).filter(_.identity).object().value();
        definition.__textIndex = [String];
        var schema = new Schema(definition, {
            collection: table.tableName
        });
        models[table.entityTypeId] = connection.model(table.entityTypeId, schema);
        return models[table.entityTypeId];
    }

    service.setupModel = function (table) {
        modelFor(table);
    };

    service.findCount = function (table, filteringAndSorting) {
        return onlyFilteringEnsureIndexes(table, filteringAndSorting).then(function () {
            return Q(modelFor(table).count(queryFor(table, filteringAndSorting)).exec());
        })
    };

    service.findAll = function (table, filteringAndSorting) {
        return ensureIndexes(table, filteringAndSorting).then(function () {
            return Q(modelFor(table).find(queryFor(table, filteringAndSorting)).sort(sortingFor(filteringAndSorting, table.fields)).exec())
                .then(function (result) { return result.map(fromBson(table.fields)) });
        });
    };

    service.findRange = function (table, filteringAndSorting, start, count) {
        return ensureIndexes(table, filteringAndSorting).then(function () {
            return Q(modelFor(table).find(queryFor(table, filteringAndSorting)).sort(sortingFor(filteringAndSorting, table.fields)).limit(count).skip(start).exec())
                .then(function (result) { return result.map(fromBson(table.fields)) });
        });
    };

    service.checkUserPassword = function (table, entityId, passwordField, password) {
        if (!entityId) {
            throw new Error('entityId should be defined for checkUserPassword()');
        }
        return Q(modelFor(table).findById(toMongoId(entityId)).exec()).then(function (user) {
            if (!user) {
                return false;
            }
            var userId = user._id.toString();
            var digest = service.passwordHash(userId, password);
            return digest === user.passwordHash ? fromBson(table.fields)(user) : false;
        });
    };

    function sortingFor(filteringAndSorting, fields) {
        return _.object(_.union(filteringAndSorting && filteringAndSorting.sorting && filteringAndSorting.sorting.filter(function (i) { return !!fields[i[0]]}) || [], [['modifyTime', -1]]));
    }

    function ensureIndexes(table, filteringAndSorting) {
        var indexFieldHash = {};
        var indexes = [];

        indexes = _.map(sortingFor(filteringAndSorting, table.fields), function (order, fieldName) { return [fieldName, order]});
        _.forEach(indexes, function (i) { indexFieldHash[i[0]] = true });

        return ensureIndexesWith(indexes, indexFieldHash, table, filteringAndSorting);
    }

    function onlyFilteringEnsureIndexes(table, filteringAndSorting) {
        return ensureIndexesWith([], {}, table, filteringAndSorting);
    }

    function ensureIndexesWith(indexes, indexFieldHash, table, filteringAndSorting) {
        var query = queryFor(table, filteringAndSorting);
        function addIndexField(q, fieldName) {
            if (fieldName === '$and' || fieldName === '$or') {
                _.forEach(q, function (qObj) {_.forEach(qObj, addIndexField) });
            } else if (!indexFieldHash[fieldName]) {
                indexes.unshift([fieldName, 1]);
                indexFieldHash[fieldName] = true;
            }
        }
        _.forEach(query, addIndexField);

        if (indexes.length > 0) {
            var collection = db.collection(table.tableName);
            return Q.nfbind(collection.ensureIndex.bind(collection))(indexes, {name: crypto.createHash('sha1').update(JSON.stringify(indexes)).digest('hex')});
        } else {
            return Q(null);
        }
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
        var query = {};
        if (filteringAndSorting) {
            if (filteringAndSorting.query) {
                query = _.clone(filteringAndSorting.query); //TODO merging filtering and query
            }
            if (filteringAndSorting.textSearch) {
                var split = splitText(filteringAndSorting.textSearch);
                if (split.length > 0) {
                    query.$and = split.map(function (value) { return {__textIndex: { $regex: value + ".*" }}});
                }
            }
            if (filteringAndSorting.filtering) {
                var allFields = getAllFields(table);
                _.each(allFields, function (field, fieldName) {
                    if (_.isUndefined(filteringAndSorting.filtering[fieldName])) {
                        return;
                    }
                    var filterValue = filteringAndSorting.filtering[fieldName];
                    if (field.fieldType.id == 'reference') {
                        query[fieldName + '.id'] = toMongoId(filteringAndSorting.filtering[fieldName])
                    } else if (field.fieldType.id == 'checkbox') {
                        query[fieldName] = filteringAndSorting.filtering[fieldName] ? filteringAndSorting.filtering[fieldName] : {$in: [false, null]};
                    } else if (field.fieldType.id == 'date') {
                        if (filterValue.op === 'gt') {
                            query[fieldName] = {$gt: filterValue.value}; //TODO convert from string?
                        } else if (filterValue.op === 'lt') {
                            query[fieldName] = {$lt: filterValue.value}; //TODO convert from string?
                        } else {
                            query[fieldName] = filterValue;
                        }
                    } else if (field.fieldType.id == 'text') {
                        if (filterValue.op === 'startsWith') {
                            query[fieldName] = { $regex: filterValue.value + ".*" };
                        } else if (filterValue.op === 'in') {
                            query[fieldName] = { $in: filterValue.value };
                        } else {
                            query[fieldName] = filterValue;
                        }
                    } else {
                        query[fieldName] = filteringAndSorting.filtering[fieldName];
                    }
                });
            }
        }
        return query;
    }

    service.queryFor = queryFor;

    service.newEntityId = function () {
        return (new ObjectId()).toString();
    };

    service.createEntity = function (table, entity) {
        return callBeforeCrudListeners(table, null, entity).then(function () {
            var objectID = entity.id && toMongoId(entity.id) || new ObjectId();
            entity.id = (objectID).toString();
            var toInsert = toBson(table.fields)(entity);
            toInsert._id = objectID;
            toInsert.createTime = new Date();
            toInsert.modifyTime = new Date();
            setAuxiliaryFields(table.fields, toInsert, toInsert);
            return Q(modelFor(table).create(toInsert)).catch(function (err) {
                if (err.message.indexOf('duplicate key error index') !== -1) {
                    var fieldToMessage = {};
                    _.forEach(toInsert, function (v, name) {
                        if (err.message.indexOf(name) !== -1) {
                            fieldToMessage[name] = 'Should be unique';
                        }
                    });
                    throw new appUtil.ValidationError(fieldToMessage);
                }
                throw err;
            })
                .then(callAfterCrudListeners(table, null, fromBson(table.fields)(toInsert)))
                .then(function (result) {
                    return result._id;
                });
        });

    };

    service.aggregateQuery = function (table, aggregatePipeline) {
        var collection = db.collection(table.tableName);
        return Q.nfbind(collection.aggregate.bind(collection))(aggregatePipeline).then(function (rows) {
            return rows.map(fromBson(table.fields));
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
        return Q(modelFor(table).findById(toMongoId(entityId)).exec()).then(function (result) {
            return result && fromBson(table.fields)(result) || result;
        });
    };

    service.updateEntity = function (table, entity) {
        return service.readEntity(table, entity.id).then(function (oldEntity) {
            var newEntity = _.extend(Object.create(oldEntity), entity);
            return callBeforeCrudListeners(table, oldEntity, newEntity).then(function () {
                var toUpdate = toBson(table.fields)(_.extendOwn({}, newEntity));
                toUpdate.modifyTime = new Date();
                return Q(modelFor(table).findOneAndUpdate({_id: toMongoId(entity.id)}, toUpdate).exec())
                    .then(callAfterCrudListeners(table, oldEntity, newEntity)) //TODO REST layer should convert all data types
                    .then(function () {
                        return service.readEntity(table, entity.id).then(function (result) {
                            var update = {};
                            setAuxiliaryFields(table.fields, result, update);
                            return Q(modelFor(table).findOneAndUpdate({_id: toMongoId(entity.id)}, update).exec());
                        });
                    }).then(function (result) {
                        return fromBson(table.fields)(result);
                    });
            });
        });
    };

    service.deleteEntity = function (table, entityId) {
        return service.readEntity(table, entityId).then(function (oldEntity) {
            return callBeforeCrudListeners(table, oldEntity, null).then(function () {
                return Q(modelFor(table).findOneAndRemove({_id: toMongoId(entityId)}).exec()).then(callAfterCrudListeners(table, oldEntity, null));
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
        setTextIndex(fields, entity, toUpdate);
    }

    function setTextIndex(fields, entity, toUpdate) {
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
            if (entity._id) {
                result.id = entity._id.toString();
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

    function fromBsonValue(value, field, entity) {
        if (field.fieldType.id == 'money' && value) {
            return value.toString(10);
        } else if (field.fieldType.id == 'checkbox' && field.fieldType.storeAsArrayField) {
            return entity[field.fieldType.storeAsArrayField] &&
                _.isArray(entity[field.fieldType.storeAsArrayField]) &&
                entity[field.fieldType.storeAsArrayField].indexOf(field.name) != -1
        } else if (field.fieldType.id == 'password') {
            return '';
        } else if (field.fieldType.id == 'reference') {
            return value && value.id ? {id: value.id.toString(), name: value.name} : undefined;
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
                throw new Error("Reference value without id was passed for field '" + fieldName + "'"); //TODO mongoose returns empty objects for reference if it's undefined, Maybe return null here?
            }
            return {
                id: toMongoId(value.id),
                name: value.name
            }
        } else if (field.fieldType.id == 'money' && value) {
            return mongo.Long.fromString(value.toString());
        } else if (field.fieldType.id == 'checkbox' && field.fieldType.storeAsArrayField && !_.isUndefined(value)) {
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
        } else if (field.fieldType.id == 'password' && value) {
            return service.passwordHash(entity.id, value);
        }
        return value;
    }

    service.passwordHash = function (objectId, password) {
        var hash = crypto.createHmac('sha1', objectId.toString());
        hash.update(password, 'utf8');
        return hash.digest('hex');
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