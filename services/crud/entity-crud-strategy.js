var _ = require('lodash');
var Q = require('q');

module.exports = function (entityDescriptionService, storageDriver, injection, queryPerformerService, validationService) {
    var service = {};

    service.crudHandlerFor = function (crudId) {
        if (!crudId.entityTypeId) {
            return undefined;
        }

        function addDefaultFiltering(filteringAndSorting) {
            if (!filteringAndSorting) {
                filteringAndSorting = {};
            }
            if (!filteringAndSorting.filtering) {
                filteringAndSorting.filtering = {};
            }

            var entityDescription = entityDescriptionService.entityDescription(crudId);
            var filtering = entityDescription.filtering();
            if (filtering) {
                _.merge(filteringAndSorting, filtering);
            }
            if (entityDescription.sorting) {
                filteringAndSorting.sorting = entityDescription.sorting;
            }

            return filteringAndSorting;
        }

        function backReferenceField() {
            return entityDescriptionService.entityDescription({entityTypeId: crudId.entityTypeId}).allFields[crudId.relationField].fieldType.backReferenceField;
        }

        function setupRelationFieldFiltering(filteringAndSorting) {
            if (!filteringAndSorting) {
                filteringAndSorting = {};
            }
            if (!filteringAndSorting.filtering) {
                filteringAndSorting.filtering = {};
            }
            filteringAndSorting.filtering[backReferenceField()] = crudId.parentEntityId;
            return filteringAndSorting;
        }

        function getParentReferenceValue() {
            return injection.inject('referenceService').referenceValueByEntityId({entityTypeId: crudId.entityTypeId}, crudId.parentEntityId); //TODO cycle dependency
        }

        if (crudId.relationField) {

            return {
                findAll: function (filteringAndSorting) {
                    filteringAndSorting = setupRelationFieldFiltering(filteringAndSorting);
                    return storageDriver.findAll(entityDescriptionService.tableDescription(crudId), filteringAndSorting);
                },
                findCount: function (filteringAndSorting) {
                    filteringAndSorting = setupRelationFieldFiltering(filteringAndSorting);
                    return storageDriver.findCount(entityDescriptionService.tableDescription(crudId), filteringAndSorting);
                },
                getTotalRow: function (filteringAndSorting) {
                    return getTotalRowBase(setupRelationFieldFiltering(filteringAndSorting));
                },
                findRange: function (filteringAndSorting, start, count) {
                    filteringAndSorting = setupRelationFieldFiltering(filteringAndSorting);
                    return storageDriver.findRange(entityDescriptionService.tableDescription(crudId), filteringAndSorting, start, count);
                },
                createEntity: function (entity) {
                    validationService.validateEntity(crudId, entity);
                    return getParentReferenceValue().then(function (parentReferenceValue) {
                        var bfField = backReferenceField();
                        if (!entity[bfField] || !_.isEqual(entity[bfField], parentReferenceValue)) {
                            entity[bfField] = parentReferenceValue;
                        }
                        return storageDriver.createEntity(entityDescriptionService.tableDescription(crudId), entity);
                    });
                },
                readEntity: function (entityId) {
                    return storageDriver.readEntity(entityDescriptionService.tableDescription(crudId), entityId);
                },
                updateEntity: function (entity) {
                    return this.readEntity(entity.id).then(function (oldEntity) {
                        validationService.validateEntity(crudId, _.extend(oldEntity, entity));
                        return getParentReferenceValue().then(function (parentReferenceValue) {
                            var bfField = backReferenceField();
                            if (!_.isUndefined(entity[bfField]) && !_.isEqual(entity[bfField], parentReferenceValue)) {
                                entity[bfField] = parentReferenceValue;
                            }
                            return storageDriver.updateEntity(entityDescriptionService.tableDescription(crudId), entity);
                        });
                    });
                },
                deleteEntity: function (entityId) {
                    return storageDriver.deleteEntity(entityDescriptionService.tableDescription(crudId), entityId)
                }
            }
        }


        return {
            findAll: function (filteringAndSorting) {
                return storageDriver.findAll(entityDescriptionService.tableDescription(crudId), addDefaultFiltering(filteringAndSorting));
            },
            findCount: function (filteringAndSorting) {
                return storageDriver.findCount(entityDescriptionService.tableDescription(crudId), addDefaultFiltering(filteringAndSorting));
            },
            getTotalRow: getTotalRowBase,
            findRange: function (filteringAndSorting, start, count) {
                return storageDriver.findRange(entityDescriptionService.tableDescription(crudId), addDefaultFiltering(filteringAndSorting), start, count);
            },
            createEntity: function (entity) {
                validationService.validateEntity(crudId, entity);
                return storageDriver.createEntity(entityDescriptionService.tableDescription(crudId), entity);
            },
            readEntity: function (entityId) {
                return storageDriver.readEntity(entityDescriptionService.tableDescription(crudId), entityId); //TODO default filtering for security
            },
            updateEntity: function (entity) {
                return this.readEntity(entity.id).then(function (oldEntity) {
                    validationService.validateEntity(crudId, _.extend(oldEntity, entity));
                    return storageDriver.updateEntity(entityDescriptionService.tableDescription(crudId), entity); //TODO default filtering for security
                })
            },
            deleteEntity: function (entityId) {
                return storageDriver.deleteEntity(entityDescriptionService.tableDescription(crudId), entityId); //TODO default filtering for security
            }
        };

        function getTotalRowBase(filteringAndSorting) {
            var fieldNameToTotalRowFun = _.object(_.chain(entityDescriptionService.entityDescription(crudId).allFields).map(function (f, fieldName) {
                return f.totalRowFun && [fieldName, f.totalRowFun] || undefined;
            }).filter(function (f) { return !!f }).value());
            if (_.size(fieldNameToTotalRowFun) > 0) {
                return queryPerformerService.performAggregateForFiltering(filteringAndSorting, crudId, fieldNameToTotalRowFun);
            } else {
                return Q(null);
            }
        }
    };


    return service;
};