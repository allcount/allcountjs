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
        return crudService.referenceValueByEntityId(crudId, entityId);
    };

    service.resolveReferenceValues = function (crudId, entity) {
        return crudService.resolveReferenceValues(crudId, entity);
    };

    return service;
};