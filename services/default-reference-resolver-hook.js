var _ = require('underscore');
var Q = require('q');

module.exports = function (entityDescriptionService, storageDriver, crudService) {
    return {
        compile: function (objects, errors) {
            _.forEach(entityDescriptionService.entityDescriptions, function (description, rootEntityTypeId) {
                storageDriver.addBeforeCrudListener(description.tableDescription, function (oldEntity, newEntity) {
                    if (newEntity) {
                        return crudService.resolveReferenceValues(entityDescriptionService.entityTypeIdCrudId(rootEntityTypeId), newEntity);
                    }
                })
            });
        }
    }
};