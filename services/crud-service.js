var _ = require('underscore');
var Q = require('q');

module.exports = function (crudStrategies, storageDriver, entityDescriptionService, injection, appUtil, securityService) {
    var service = {};

    service.strategyForCrudId = function (crudId) {
        if (_.isString(crudId)) {
            crudId = entityDescriptionService.entityTypeIdCrudId(crudId);
        }
        return _.map(crudStrategies, function (strategy) {
            return securityWrapper(crudId, strategy.crudHandlerFor(crudId));
        })[0];
    };

    service.systemStrategyForCrudId = function (crudId) {
        return systemCrudWrapper(service.strategyForCrudId(crudId));
    };

    service.referenceValueByEntityId = function (crudId, entityId) { //TODO doubling
        var referenceFieldName = entityDescriptionService.entityDescription(crudId).referenceNameExpression;
        return service.strategyForCrudId(crudId).readEntity(entityId).then(function (e) {
            return {id: e.id, name: e[referenceFieldName]};
        });
    };

    service.resolveReferenceValues = function (crudId, entity) {
        return Q.all(entityDescriptionService.entityDescription(crudId).fields.map(function (field) {
            if (field.fieldType.id === 'reference' && entity.hasOwnProperty(field.field) && entity[field.field] && entity[field.field].id) {
                return service.referenceValueByEntityId(
                    entityDescriptionService.entityTypeIdCrudId(field.fieldType.referenceEntityTypeId),
                    entity[field.field].id
                ).then(function (referenceValue) {
                        entity[field.field] = referenceValue;
                    });
            } else if (field.fieldType.id === 'multiReference' && entity.hasOwnProperty(field.field) && entity[field.field]) {
                return Q.all(entity[field.field].map(function (entry) {
                    return service.referenceValueByEntityId(
                        entityDescriptionService.entityTypeIdCrudId(field.fieldType.referenceEntityTypeId),
                        entry.id
                    )
                })).then(function (referenceValue) {
                    entity[field.field] = referenceValue;
                });
            }
            return undefined;
        }));
    };

    function securityWrapper(crudId, crudStrategy) {
        var result = {};
        wrap(function () {
            var next = this;
            checkPermission('Read', 'userHasReadAccess');
            return next();
        }, ['findAll', 'findCount', 'getTotalRow', 'findRange', 'readEntity'], result, crudStrategy);
        wrap(function () {
            var next = this;
            checkPermission('Create', 'userHasCreateAccess');
            return next();
        }, ['createEntity'], result, crudStrategy);
        wrap(function () {
            var next = this;
            checkPermission('Update', 'userHasUpdateAccess');
            return next();
        }, ['updateEntity'], result, crudStrategy);
        wrap(function () {
            var next = this;
            checkPermission('Delete', 'userHasDeleteAccess');
            return next();
        }, ['deleteEntity'], result, crudStrategy);

        wrap(function () {
            var next = this;
            var filteredFields = entityDescriptionService.readPermissionFilteredFields(crudId, injection.inject('User', true));
            return next().then(function (items) {
                return filterItems(items, filteredFields);
            });
        }, ['findAll', 'findRange'], result);

        wrap(function () {
            var next = this;
            var filteredFields = entityDescriptionService.readPermissionFilteredFields(crudId, injection.inject('User', true));
            return next().then(function (item) {
                return item && filterFields(item, filteredFields);
            });
        }, ['getTotalRow', 'readEntity'], result);

        wrap(function (item) {
            var next = this;
            var filteredFields = entityDescriptionService.writePermissionFilteredFields(crudId, injection.inject('User', true));
            filterFields(item, filteredFields);
            return next();
        }, ['createEntity', 'updateEntity'], result);

        return result;

        function filterItems(items, filteredFields) {
            _.forEach(items, function (item) {
                filterFields(item, filteredFields);
            });
            return items;
        }

        function filterFields(item, filteredFields) {
            _.forEach(item, function (value, fieldName) {
                if (!filteredFields[fieldName] && fieldName !== 'id') { //TODO is id really special here?
                    delete item[fieldName];
                }
            });
            return item;
        }

        function checkPermission(permissionName, permissionCheckMethod) {
            var user = injection.inject('User', true);
            if (!entityDescriptionService[permissionCheckMethod](crudId, user)) {
                throw new appUtil.ForbiddenError(permissionName + ' permission to ' + JSON.stringify(crudId) + ' denied for ' + (user ? '"' + user.username + '"' : 'unauthorized user'));
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
        target = target || obj;
        _.forEach(methodsToWrap, function (methodName) {
            var targetFn = target[methodName];
            obj[methodName] = function () {
                var args = arguments;
                return proxyFn.apply(function () {
                    return targetFn.apply(target, args);
                }, args);
            }
        });
    }

    return service;
};