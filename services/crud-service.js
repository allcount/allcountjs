var _ = require('underscore');

module.exports = function (crudStrategies, storageDriver, entityDescriptionService, injection, appUtil, securityService) {
    var service = {};

    service.strategyForCrudId = function (crudId) {
        return _.map(crudStrategies, function (strategy) {
            return securityWrapper(crudId, strategy.crudHandlerFor(crudId));
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

    function securityWrapper(crudId, crudStrategy) {
        var result = {};
        wrap(function (next) {
            checkReadPermission();
            return next();
        }, ['findAll', 'findCount', 'getTotalRow', 'findRange', 'readEntity'], result, crudStrategy);
        wrap(function (next) {
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
        wrap(function (next) {
            return securityService.asSystemUser(next);
        }, ['findAll', 'findCount', 'getTotalRow', 'findRange', 'readEntity', 'createEntity', 'updateEntity', 'deleteEntity'], result, crudStrategy);
        return result;
    }

    function wrap(proxyFn, methodsToWrap, obj, target) {
        _.forEach(methodsToWrap, function (methodName) {
            obj[methodName] = function () {
                var args = arguments;
                return proxyFn(function () {
                    return target[methodName].apply(target, args);
                });
            }
        });
    }

    return service;
};