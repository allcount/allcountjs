var _ = require('underscore');
var Q = require('q');

module.exports = function (entityDescriptionService, storageDriver, queryCompileService, queryPerformerService) {
    return {
        compile: function(objects, errors) {
            var addedComputedFields = {};
            _.forEach(entityDescriptionService.entityDescriptions, function (description, rootEntityTypeId) {
                var fieldNameToComputeQuery = _.chain(description.allFields).map(function (field, fieldName) {
                    if (field.computeExpression) {
                        return [fieldName, queryCompileService.compileValueSelect(rootEntityTypeId, field.computeExpression)];
                    }
                    return undefined;
                }).filter(function (v) {return !!v}).object().value();
                _.forEach(fieldNameToComputeQuery, function (query, fieldName) {
                    if (addedComputedFields[description.tableDescription.tableName + ':' + fieldName]) {
                        return;
                    }
                    addedComputedFields[description.tableDescription.tableName + ':' + fieldName] = true;

                    var path;
                    if (query.fun) {
                        path = query.value.path;
                    } else if (query.path) {
                        path = query.path;
                    }

                    _.forEach(path, function (pathElement) {
                        if (!pathElement.entityTypeId) {
                            return;
                        }
                        storageDriver.addAfterCrudListener(
                            entityDescriptionService.tableDescription(entityDescriptionService.entityTypeIdCrudId(pathElement.entityTypeId)),
                            function (oldEntity, newEntity) {
                                return queryPerformerService.getChangedIds(query, rootEntityTypeId, oldEntity, newEntity).then(function (changedIds) {
                                    return Q.all(changedIds.map(function (changedId) {
                                        return queryPerformerService.performSingleValueSelect(query, rootEntityTypeId, changedId).then(function (value) {
                                            var toUpdate = {id: changedId};
                                            toUpdate[fieldName] = value;
                                            return storageDriver.updateEntity(description.tableDescription, toUpdate);
                                        })
                                    }));
                                })
                            }
                        )
                    });
                })
            });
        }
    }
};