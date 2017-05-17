var _ = require('underscore');
var Q = require('q');

module.exports = function (entityDescriptionService, storageDriver, crudService) {
    return {
        compile: function (objects, errors) {
            var addedTables = {};
            _.forEach(entityDescriptionService.entityDescriptions, function (description, rootEntityTypeId) {
                if (addedTables[description.tableDescription.tableName]) {
                    return;
                }
                addedTables[description.tableDescription.tableName] = true;
                storageDriver.addBeforeCrudListener(description.tableDescription, function (oldEntity, newEntity) {
                    if (newEntity) {
                        return crudService.resolveReferenceValues(entityDescriptionService.entityTypeIdCrudId(rootEntityTypeId), newEntity);
                    }
                })
            });
        }
    }
};