var _ = require('underscore');

module.exports = function (entityDescriptionService, storageDriver, queryCompileService, queryPerformerService) {
    return {
        compile: function(objects, errors) {
            _.forEach(entityDescriptionService.entityDescriptions, function (description, rootEntityTypeId) {
                var fieldNameToComputeQuery = _.chain(description.allFields).map(function (field, fieldName) {
                    if (field.computeExpression) {
                        return [fieldName, queryCompileService.compileValueSelect(rootEntityTypeId, field.computeExpression)];
                    }
                    return undefined;
                }).filter(function (v) {return !!v}).object().value();
                _.forEach(fieldNameToComputeQuery, function (query, fieldName) {
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
                        storageDriver.addEntityListener(
                            entityDescriptionService.tableDescription(entityDescriptionService.entityTypeIdCrudId(pathElement.entityTypeId)),
                            function (oldEntity, newEntity) {
                                //TODO get changed ids
                                return storageDriver.findAll(description.tableDescription, {}).then(function (rootEntities) {
                                    return rootEntities.map(function (rootEntity) {
                                        return queryPerformerService.performSingleValueSelect(query, rootEntityTypeId, rootEntity.id).then(function (value) {
                                            rootEntity[fieldName] = value;
                                            return storageDriver.updateEntity(description.tableDescription, rootEntity);
                                        })
                                    });
                                });
                            }
                        )
                    });
                })
            });
        }
    }
};