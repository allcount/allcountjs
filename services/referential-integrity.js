var _ = require('lodash');

module.exports = function (entityDescriptionService, storageDriver, entityReferencedService) {
    return {
        compile: function (objects, errors) {
            _.pairs(entityDescriptionService.entityDescriptions).filter(function (rootEntityTypeIdAndDescription) {
                return !rootEntityTypeIdAndDescription[1].disableReferentialIntegrity
            }).forEach(function (rootEntityTypeIdAndDescription) {
                var crudId = entityDescriptionService.entityTypeIdCrudId(rootEntityTypeIdAndDescription[0]);
                storageDriver.addEntityListener(
                    entityDescriptionService.
                        tableDescription(crudId),
                    function (oldEntity, newEntity) {
                        if (newEntity) return;
                        return entityReferencedService.isEntityReferenced(oldEntity.id, crudId).then(function(result) {
                            if (result) {
                                throw new Error('Can\'t delete entity: referential integrity violation');
                            }
                        });
                    }
                );
            });
        }
    };
};