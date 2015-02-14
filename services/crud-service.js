var _ = require('underscore');
var Q = require('q');

module.exports = function (crudStrategies, storageDriver, entityDescriptionService, injection, appUtil, securityService) {
    var service = {};

    service.strategyForCrudId = function (crudId) {
        return _.map(crudStrategies, function (strategy) {
            return resolveReferencesWrapper(crudId, securityWrapper(crudId, strategy.crudHandlerFor(crudId)));
        })[0];
    };

    service.systemStrategyForCrudId = function (crudId) {
        return systemCrudWrapper(service.strategyForCrudId(crudId));
    };

    service.setupModels = function () {
        _.forEach(entityDescriptionService.entityDescriptions, function (description) {
            storageDriver.setupModel(description.tableDescription);
        })
    };

    service.compile = function () {
        this.setupModels();
    };

    service.referenceValueByEntityId = function (crudId, entityId) { //TODO doubling
        var referenceFieldName = entityDescriptionService.entityDescription(crudId).referenceNameExpression;
        return service.strategyForCrudId(crudId).readEntity(entityId).then(function (e) {
            return {id: e.id, name: e[referenceFieldName]};
        });
    };

    service.resolveReferenceValues = function (crudId, entity) {
        return Q.all(entityDescriptionService.entityDescription(crudId).fields.map(function (field) {
            if (field.fieldType.id === 'reference' && entity[field.field] && entity[field.field].id) {
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

    function resolveReferencesWrapper(crudId, crudStrategy) {
        var result = {};
        _.extend(result, crudStrategy);
        wrap(function (entity) {
            var next = this;
            return service.resolveReferenceValues(crudId, entity).then(function () {
                return next();
            })
        }, ['createEntity', 'updateEntity'], result, crudStrategy);
        return result;
    }

    function securityWrapper(crudId, crudStrategy) {
        var result = {};
        wrap(function () {
            var next = this;
            checkReadPermission();
            return next();
        }, ['findAll', 'findCount', 'getTotalRow', 'findRange', 'readEntity'], result, crudStrategy);
        wrap(function () {
            var next = this;
            checkWritePermission();
            return next();
        }, ['createEntity', 'updateEntity', 'deleteEntity'], result, crudStrategy);

        return result;

        function checkReadPermission() {
            var user = injection.inject('User', true);
            if (!entityDescriptionService.userHasReadAccess(crudId, user)) {
                throw new appUtil.ForbiddenError('Read permission to ' + JSON.stringify(crudId) + ' denied for ' + user.username);
            }
        }

        function checkWritePermission() {
            var user = injection.inject('User', true);
            if (!entityDescriptionService.userHasWriteAccess(crudId, user)) {
                throw new appUtil.ForbiddenError('Write permission to ' + JSON.stringify(crudId) + ' denied for ' + user.username);
            }
        }
    }

    function systemCrudWrapper(crudStrategy) {
        var result = {};
        wrap(function () {
            var next = this;
            return securityService.asSystemUser(next);
        }, ['findAll', 'findCount', 'getTotalRow', 'findRange', 'readEntity', 'createEntity', 'updateEntity', 'deleteEntity'], result, crudStrategy);
        return result;
    }

    function wrap(proxyFn, methodsToWrap, obj, target) {
        _.forEach(methodsToWrap, function (methodName) {
            obj[methodName] = function () {
                var args = arguments;
                return proxyFn.apply(function () {
                    return target[methodName].apply(target, args);
                }, args);
            }
        });
    }

    return service;
};