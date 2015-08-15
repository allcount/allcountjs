var _ = require('underscore');

module.exports = function (entityDescriptionService, storageDriver) {
    var AggregateFunToMongoFun = {
        sum: "$sum"
    };
    return {
        performSingleValueSelect: function (query, rootEntityTypeId, rootEntityId) {
            if (query.fun) {
                if (query.fun === 'sum') {
                    var path = query.value.path;
                    if (path.length !== 2) {
                        throw new Error('Only two path elements are supported for queries');
                    }
                    if (path[0].forward === false) {
                        var tableDescription = entityDescriptionService.tableDescription(entityDescriptionService.entityTypeIdCrudId(path[0].entityTypeId));
                        var filter = {};
                        filter[path[0].backReferenceField] = rootEntityId;
                        var grouping = {_id: null};
                        grouping[path[1].fieldName] = {$sum: "$" + path[1].fieldName};
                        return storageDriver.aggregateQuery(tableDescription, [
                            { $match: storageDriver.queryFor(tableDescription, {filtering: filter}) },
                            { $group: grouping }
                        ]).then(function (row) {
                            return row[0] && row[0][path[1].fieldName];
                        });
                    } else {
                        throw new Error('Only back reference queries are supported')
                    }
                } else {
                    throw new Error('Only sum queries are supported')
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