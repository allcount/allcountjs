var _ = require('underscore');
var Q = require('q');
var moment = require('moment');
var crypto = require('crypto');
var mongoose = require('mongoose');
var mongo = mongoose.mongo;
var GridStore = mongo.GridStore;
var ObjectId = mongoose.Types.ObjectId;
require('mongoose-long')(mongoose);

module.exports = function (dbUrl, injection, appUtil) {
    var service = {};
    var db;
    var models = {};

    var connection = mongoose.createConnection(dbUrl);

    var onConnectedDeferred = Q.defer();
    var onConnectedPromise = onConnectedDeferred.promise;

    connection.on('connected', function () {
        db = connection.db;
        onConnectedDeferred.resolve();
    });

    service.addOnConnectListener = function (listener) {
        if (db) {
            return Q(listener());
        } else {
            return onConnectedPromise = onConnectedPromise.then(function () {
                return listener();
            });
        }
    };

    service.mongooseConnection = function () {
        return connection;
    };

    service.mongooseModels = function () {
        return models;
    };

    service.serializers = {};

    function modelFor(table) {
        if (!table.entityTypeId) {
            throw new Error("entityTypeId not defined for: " + JSON.stringify(table));
        }
        if (!models[table.entityTypeId]) {
            throw new Error("Can't find model for entity: " + table.entityTypeId);
        }
        return models[table.entityTypeId];
    }

    service.findCount = function (table, filteringAndSorting) {
        return onlyFilteringEnsureIndexes(table, filteringAndSorting).then(function () {
            return Q(modelFor(table).count(queryFor(table, filteringAndSorting)).exec());
        })
    };

    service.findAll = function (table, filteringAndSorting) {
        return ensureIndexes(table, filteringAndSorting).then(function () {
            return Q(modelFor(table).find(queryFor(table, filteringAndSorting)).sort(sortingFor(filteringAndSorting, table.fields)).exec())
                .then(function (result) { return result.map(fromBson(table)) });
        });
    };

    service.findRange = function (table, filteringAndSorting, start, count) {
        return ensureIndexes(table, filteringAndSorting).then(function () {
            return Q(modelFor(table).find(queryFor(table, filteringAndSorting)).sort(sortingFor(filteringAndSorting, table.fields)).limit(count).skip(start).exec())
                .then(function (result) { return result.map(fromBson(table)) });
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
            return digest === user.passwordHash ? fromBson(table)(user) : false;
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

    var systemFields = { //TODO doubling
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
                    query.$and = split.map(function (value) { return {__textIndex: { $regex: "^" + value + ".*" }}});
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
                        var reference = filteringAndSorting.filtering[fieldName];
                        var referenceId = _.isUndefined(reference.id) ? reference : reference.id;
                        query[fieldName + '.id'] = toMongoId(referenceId)
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
                            query[fieldName] = { $regex: "^" + filterValue.value + ".*" };
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
            var toInsert = toBson(table)(entity);
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
                .then(callAfterCrudListeners(table, null, fromBson(table)(toInsert)))
                .then(function (result) {
                    return result._id;
                });
        });

    };

    service.aggregateQuery = function (table, aggregatePipeline) {
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

    service.toMongoId = toMongoId;

    service.readEntity = function (table, entityId) {
        if (!entityId) {
            throw new Error('entityId should be defined for readEntity()');
        }
        return Q(modelFor(table).findById(toMongoId(entityId)).exec()).then(function (result) {
            return result && fromBson(table)(result) || result;
        });
    };

    service.updateEntity = function (table, entity) {
        return service.readEntity(table, entity.id).then(function (oldEntity) {
            var newEntity = _.extend(Object.create(oldEntity), entity);
            return callBeforeCrudListeners(table, oldEntity, newEntity).then(function () {
                var toUpdate = toBson(table)(_.extendOwn({}, newEntity));
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
                        return fromBson(table)(result);
                    });
            });
        });
    };

    service.deleteEntity = function (table, entityId) {
        return service.readEntity(table, entityId).then(function (oldEntity) {
            return callBeforeCrudListeners(table, oldEntity, null).then(function () {
                return Q(modelFor(table).findOneAndRemove({_id: toMongoId(entityId)}).exec()).then(callAfterCrudListeners(table, oldEntity, null));
            }).then(function (result) {
                return fromBson(table)(result);
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
            } else if (field.fieldType.id == 'multiReference' && value) {
                return value.map(_.property('name')).join(' ');
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

    function fromBson(table) {
        return function (entity) {
            var result = convertEntity(table.fields, function (value, field, entity, fieldName) {
                return service.serializers[table.entityTypeId][fieldName].fromBsonValue(value, field, entity, fieldName);
            }, entity);
            if (entity._id) {
                result.id = entity._id.toString();
            }
            return result;
        }
    }

    function toBson(table) { //TODO it doesn't convert id
        return function (entity) {
            return convertEntity(table.fields, function (value, field, entity, fieldName) {
                return service.serializers[table.entityTypeId][fieldName].toBsonValue(value, field, entity, fieldName);
            }, entity);
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
        return {
            remove: function () { return removeListener(afterCrudListeners, table, listener) }
        }
    };

    service.addBeforeCrudListener = function (table, listener) {
        addCrudListener(beforeCrudListeners, table, listener);
        return {
            remove: function () { return removeListener(beforeCrudListeners, table, listener) }
        }
    };

    function addCrudListener(listeners, table, listener) {
        if (!listeners[table.tableName]) {
            listeners[table.tableName] = [];
        }
        listeners[table.tableName].push(listener);
    }

    function removeListener(listeners, table, listener) {
        listeners[table.tableName].splice(listeners[table.tableName].indexOf(listener), 1);
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