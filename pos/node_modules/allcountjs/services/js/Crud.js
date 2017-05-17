module.exports = function (crudService, entityDescriptionService, injection) {
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
            },
            findCount: function (query) {
                return crudStrategy.findCount(query);
            }
        }
    }

    return {
        actionContextCrud: function () {
            return CrudFor(injection.inject('actionContext').entityCrudId);
        },
        crudFor: function (entityTypeId) {
            return this.crudForEntityType(entityTypeId);
        },
        crudForEntityType: function (entityTypeId) {
            return CrudFor(entityDescriptionService.entityTypeIdCrudId(entityTypeId));
        }
    };
};