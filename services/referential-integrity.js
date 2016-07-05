var _ = require('lodash');

module.exports = function (entityDescriptionService, storageDriver, entityReferencedService, appUtil) {
    var makeStringOfReferencing = function (entitiesAndFields) {
        if (entitiesAndFields.length > 0) {
            return entitiesAndFields.map(function (entityTypeAndFields) {
                return 'one or more of entities "' + entityTypeAndFields[0] + '" are referencing by field(s): ' +
                    entityTypeAndFields[1].join(', ');
            }).join(';');
        } else {
            return '';
        }
    };

    return {
        compile: function (objects, errors) {
            _.pairs(entityDescriptionService.entityDescriptions).filter(function (rootEntityTypeIdAndDescription) {
                return !rootEntityTypeIdAndDescription[1].disableReferentialIntegrity
            }).forEach(function (rootEntityTypeIdAndDescription) {
                var crudId = entityDescriptionService.entityTypeIdCrudId(rootEntityTypeIdAndDescription[0]);
                storageDriver.addBeforeCrudListener(
                    entityDescriptionService.
                        tableDescription(crudId),
                    function (oldEntity, newEntity) {
                        if (newEntity) return;
                        return entityReferencedService.referencingEntitiesWithFieldNames(oldEntity.id, crudId).then(function(entitiesAndFields) {
                            if (entitiesAndFields.length > 0) {
                                throw new appUtil.ConflictError('Can\'t delete entity: referential integrity violation (' + makeStringOfReferencing(entitiesAndFields) + ')');
                            }
                        });
                    }
                );
            });
        }
    };
};