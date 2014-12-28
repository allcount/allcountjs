module.exports = function (actionContext, crudService, entityDescriptionService) {
    function CrudFor(entityCrudId) {
        var crudStrategy = crudService.strategyForCrudId(entityCrudId);

        return {
            createEntity: function (entity) {
                return crudStrategy.createEntity(entity);
            },
            readEntity: function (entityId) {
                return crudStrategy.readEntity(entityId);
            },
            updateEntity: function (entity) {
                return crudStrategy.updateEntity(entity);
            },
            deleteEntity: function (entityId) {
                return crudStrategy.deleteEntity(entityId);
            },
            find: function (query) {
                return crudStrategy.findAll(query);
            }
        }
    }

    return {
        actionContextCrud: function () {
            return CrudFor(actionContext.entityCrudId);
        },
        crudForEntityType: function (entityTypeId) {
            return CrudFor(entityDescriptionService.entityTypeIdCrudId(entityTypeId));
        }
    };
};