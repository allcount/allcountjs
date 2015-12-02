var _ = require('underscore');


module.exports = function (dbUrl, injection, appUtil, loopback, Q) {
    var service = {};

    service.addOnConnectListener = function (listener) {
        return Q(listener());
    };

    service.serializers = {};

    function modelFor(table) {
        return loopback.getModel(table.entityTypeId);
    }

    service.findCount = function (table, filteringAndSorting) {
        return Q(modelFor(table).count(queryFor(table, filteringAndSorting)));
    };

    service.findAll = function (table, filteringAndSorting) {
        return Q(modelFor(table).find({
            filter: queryFor(table, filteringAndSorting),
            order: sortingFor(filteringAndSorting, table.fields)
        })).then(function (result) { return result.map(fromBson(table)) });
    };

    service.findRange = function (table, filteringAndSorting, start, count) {
        return Q(modelFor(table).find({
            filter: queryFor(table, filteringAndSorting),
            order: sortingFor(filteringAndSorting, table.fields),
            skip: start,
            limit: count
        })).then(function (result) { return result.map(fromBson(table)) });
    };

    service.checkUserPassword = function (table, entityId, passwordField, password) {
        if (!entityId) {
            throw new Error('entityId should be defined for checkUserPassword()');
        }
        return Q(modelFor(table).findById(entityId)).then(function (user) {
            if (!user) {
                return false;
            }
            var userId = user._id.toString();
            var digest = service.passwordHash(userId, password);
            return digest === user.passwordHash ? fromBson(table)(user) : false;
        });
    };

    function sortingFor(filteringAndSorting, fields) {
        return _.union(
            filteringAndSorting && filteringAndSorting.sorting && filteringAndSorting.sorting.filter(function (i) { return !!fields[i[0]]}) || [], [['modifyTime', -1]]
        ).map(function (propertyAndDir) {
                return propertyAndDir[0] + ' ' + (propertyAndDir === -1 ? 'DESC' : 'ASC')
            });
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
        var toInsert = toBson(table)(entity);
        //setAuxiliaryFields(table.fields, toInsert, toInsert);
        return Q(modelFor(table).create(toInsert))
            .then(function (result) {
                return result.id;
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
        var toUpdate = toBson(table)(entity);
        return Q(modelFor(table).findById(entity.id)).then(function (entity) {
            entity.updateAttributes(toUpdate);
        })
    };

    service.deleteEntity = function (table, entityId) {
        return Q(modelFor(table).destroyById(entityId));
    };

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
            return entity.toObject();
        }
    }

    function toBson(table) { //TODO it doesn't convert id
        return function (entity) {
            return entity;
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