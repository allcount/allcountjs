var _ = require('underscore');

module.exports = function (entityDescriptionService, storageDriver, Q) {
    var AggregateFunToMongoFun = {
        sum: "$sum",
        count: "$sum",
        avg: "$avg",
    };
    return {
        performSingleValueSelect: function (query, rootEntityTypeId, rootEntityId) {
            if (query.fun) {
                if (AggregateFunToMongoFun[query.fun]) {
                    var path = query.value.path;
                    if (path.length !== 2 && query.fun !=='count') {
                        throw new Error('Only two path elements are supported for %s queries', AggregateFunToMongoFun[query.fun]);
                    } else if (path.length !== 1 && query.fun === 'count') {
                        throw new Error('Only one path elements are supported for count queries');
                    }
                    if (path[0].forward === false) {
                        var tableDescription = entityDescriptionService.tableDescription(entityDescriptionService.entityTypeIdCrudId(path[0].entityTypeId));
                        var entityFilter = entityDescriptionService.entityDescription(path[0].entityTypeId).filtering();
                        filter = entityFilter ? entityFilter.filtering : {};
                        filter[path[0].backReferenceField] = rootEntityId;
                        var grouping = {_id: null};
                        var mongoFun = AggregateFunToMongoFun[query.fun];
                        var aggregateFieldName = query.fun != 'count' ? path[1].fieldName : 'count';
                        grouping[aggregateFieldName] = {};
                        grouping[aggregateFieldName][mongoFun] = query.fun != 'count' ? "$" + aggregateFieldName : 1;
                        return storageDriver.aggregateQuery(tableDescription, [
                            { $match: storageDriver.queryFor(tableDescription, {filtering: filter}) },
                            { $group: grouping }
                        ]).then(function (row) {
                            return row[0] && row[0][aggregateFieldName];
                        });
                    } else {
                        throw new Error('Only back reference queries are supported')
                    }
                } else {
                    throw new Error('%s queries are not supported', query.fun)
                }
            } else {
                throw new Error('Only function queries are supported');
            }
        },
        getChangedIds: function (query, rootEntityTypeId, oldEntity, newEntity) {
            if (query.fun) {
                var path = query.value.path;
                if (path.length !== 2 && path.length !== 1) {
                    throw new Error('Only one or two path elements are supported for queries');
                }
                if (path[0].forward === false) {
                    var backReferenceFieldValue = newEntity ? newEntity[path[0].backReferenceField] : oldEntity[path[0].backReferenceField];
                    return Q(backReferenceFieldValue ? [backReferenceFieldValue.id] : []);
                } else {
                    throw new Error('Only back reference queries are supported')
                }
            } else {
                throw new Error('Only function queries are supported');
            }
        },
        performAggregateForFiltering: function (filteringAndSorting, crudId, fieldNameToFun) {
            var tableDescription = entityDescriptionService.tableDescription(crudId);

            var query = storageDriver.queryFor(tableDescription, filteringAndSorting);
            var groupElem = { $group: _.extend({_id: null}, _.object(_.map(fieldNameToFun, function (aggregateFun, fieldName) {
                var mongoFun = AggregateFunToMongoFun[aggregateFun];
                if (!mongoFun) {
                    throw new Error('Undefined aggregate function: ' + aggregateFun);
                }
                return [fieldName, _.object([[mongoFun, "$" + fieldName]])];
            })))};
            var aggregatePipeline;
            if (_.size(query) > 0) {
                aggregatePipeline = [
                    { $match: query },
                    groupElem
                ];
            } else {
                aggregatePipeline = [groupElem];
            }
            return storageDriver.aggregateQuery(tableDescription, aggregatePipeline).then(function (rows) {
                return rows[0];
            })
        }
    }
};