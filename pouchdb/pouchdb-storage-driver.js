var _ = require('underscore');
var Q = require('q');
var moment = require('moment');
var crypto = require('crypto');

module.exports = function (dbUrl, injection, appUtil, Q) {
    var service = {};
    var db;

    var PouchDB = require('pouchdb');
    PouchDB.plugin(require('pouchdb-find'));

    PouchDB.debug.enable('pouchdb:find');

    db = new PouchDB(dbUrl, {adapter: 'websql'});

    service.addOnConnectListener = function (listener) {
        return Q(listener());
    };

    service.serializers = {};

    function modelFor(table) {
        return {
            create: function (entity) {
                entity.type = table.entityTypeId;
                return db.post(entity);
            },
            findOneAndUpdate: function (entityId, entity) {
                return this.findById(entityId).then(function (existing) {
                    return db.put(_.extend({}, existing, entity), entityId, existing._rev);
                })
            },
            findOneAndRemove: function (entityId) {
                return this.findById(entityId).then(function (existing) {
                    return db.remove(existing);
                })
            },
            findById: function (id) {
                return db.get(id);
            },
            count: function (query) {
                return this.find(query).then(function (items) {
                    return items.length;
                });
            },
            find: function (query, sort, limit, skip) {
                //return db.allDocs({include_docs: true}).then(function (res) { return res.rows });
                return db.find({selector: _.extend({}, query, { type: table.entityTypeId }), sort: sort, limit: limit, skip: skip}).then(function (items) {
                    return items.docs;
                })
            }
        }
    }

    service.findCount = function (table, filteringAndSorting) {
        return onlyFilteringEnsureIndexes(table, filteringAndSorting).then(function () {
            return Q(modelFor(table).count(queryFor(table, filteringAndSorting)));
        })
    };

    service.findAll = function (table, filteringAndSorting) {
        return ensureIndexes(table, filteringAndSorting).then(function () {
            return Q(modelFor(table).find(queryFor(table, filteringAndSorting), sortingFor(filteringAndSorting, table.fields)))
                .then(function (result) { return result.map(fromBson(table)) });
        });
    };

    service.findRange = function (table, filteringAndSorting, start, count) {
        return ensureIndexes(table, filteringAndSorting).then(function () {
            return Q(modelFor(table).find(queryFor(table, filteringAndSorting), sortingFor(filteringAndSorting, table.fields), count, start))
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
        return [{type: 'asc'}]; //TODO
        //return _.union(filteringAndSorting && filteringAndSorting.sorting && filteringAndSorting.sorting.filter(function (i) { return !!fields[i[0]]}) || []/*, [['modifyTime', -1]]*/) //TODO
        //    .map(function (f) { return _.object([f[0], f[1] > 0 ? 'asc' : 'desc']) });
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
        return Q(db.createIndex({
            index: {
                fields: ['type']
            }
        })); //TODO

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
            //var objectID = entity.id && toMongoId(entity.id) || new ObjectId();
            //entity.id = (objectID).toString();
            var toInsert = toBson(table)(entity);
            //toInsert._id = objectID;
            toInsert.createTime = new Date();
            toInsert.modifyTime = new Date();
            setAuxiliaryFields(table.fields, toInsert, toInsert);
            return Q(modelFor(table).create(toInsert))
                .then(callAfterCrudListeners(table, null, fromBson(table)(toInsert)))
                .then(function (result) {
                    return result._id;
                });
        });

    };

    service.aggregateQuery = function (table, aggregatePipeline) {
        var collection = db.collection(table.tableName);
        return Q.nfbind(collection.aggregate.bind(collection))(aggregatePipeline).then(function (rows) {
            return rows.map(fromBson(table));
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
        return Q(modelFor(table).findById(entityId)).then(function (result) {
            return result && fromBson(table)(result) || result;
        });
    };

    service.updateEntity = function (table, entity) {
        return service.readEntity(table, entity.id).then(function (oldEntity) {
            var newEntity = _.extend(Object.create(oldEntity), entity);
            return callBeforeCrudListeners(table, oldEntity, newEntity).then(function () {
                var toUpdate = toBson(table)(_.extendOwn({}, newEntity));
                toUpdate.modifyTime = new Date();
                return Q(modelFor(table).findOneAndUpdate(entity.id, toUpdate))
                    .then(callAfterCrudListeners(table, oldEntity, newEntity)) //TODO REST layer should convert all data types
                    /*.then(function () {
                        return service.readEntity(table, entity.id).then(function (result) {
                            var update = {};
                            setAuxiliaryFields(table.fields, result, update);
                            return Q(modelFor(table).findOneAndUpdate(entity.id, update));
                        });
                    })*/.then(function (result) {
                        return fromBson(table)(result);
                    });
            });
        });
    };

    service.deleteEntity = function (table, entityId) {
        return service.readEntity(table, entityId).then(function (oldEntity) {
            return callBeforeCrudListeners(table, oldEntity, null).then(function () {
                return Q(modelFor(table).findOneAndRemove(entityId)).then(callAfterCrudListeners(table, oldEntity, null));
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
        //setTextIndex(fields, entity, toUpdate);
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
                return value; //TODO service.serializers[table.entityTypeId][fieldName].fromBsonValue(value, field, entity, fieldName);
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
                return value; //TODO service.serializers[table.entityTypeId][fieldName].toBsonValue(value, field, entity, fieldName);
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
        return Q(); //TODO
    };

    return service;
};