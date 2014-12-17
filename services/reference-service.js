var Q = require('q');

module.exports = function (entityDescriptionService, crudService) {
    var service = {};

    service.referenceValues = function (crudId, queryText) {
        var referenceFieldName = entityDescriptionService.entityDescription(crudId).referenceNameExpression;
        return crudService.strategyForCrudId(crudId).findAll({textSearch: queryText}).then(function (entities) {
            return entities.map(function (e) {
                return {id: e.id, name: e[referenceFieldName]};
            })
        });
    };

    service.referenceValueByEntityId = function (crudId, entityId) { //TODO doubling
        var referenceFieldName = entityDescriptionService.entityDescription(crudId).referenceNameExpression;
        return crudService.strategyForCrudId(crudId).readEntity(entityId).then(function (e) {
            return {id: e.id, name: e[referenceFieldName]};
        });
    };

    service.resolveReferenceValues = function (crudId, entity) {
        return Q.all(entityDescriptionService.entityDescription(crudId).fields.map(function (field) {
            if (field.fieldType.id === 'reference' && entity[field.field]) {
                return service.referenceValueByEntityId(
                        entityDescriptionService.entityTypeIdCrudId(field.fieldType.referenceEntityTypeId),
                        entity[field.field].id
                    ).then(function (referenceValue) {
                        entity[field.field] = referenceValue;
                    });
            }
            return undefined;
        }));
    };

    return service;
};