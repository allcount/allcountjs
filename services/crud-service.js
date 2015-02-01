var _ = require('underscore');

module.exports = function (crudStrategies, storageDriver, entityDescriptionService, injection, appUtil) {
    var service = {};

    service.strategyForCrudId = function (crudId) {
        return _.map(crudStrategies, function (strategy) {
            return securityWrapper(crudId, strategy.crudHandlerFor(crudId));
        })[0];
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
        return {
            findAll: function () {
                checkReadPermission();
                return crudStrategy.findAll.apply(crudStrategy, arguments);
            },
            findCount: function () {
                checkReadPermission();
                return crudStrategy.findCount.apply(crudStrategy, arguments);
            },
            getTotalRow: function () {
                checkReadPermission();
                return crudStrategy.getTotalRow.apply(crudStrategy, arguments);
            },
            findRange: function () {
                checkReadPermission();
                return crudStrategy.findRange.apply(crudStrategy, arguments);
            },
            createEntity: function () {
                checkWritePermission();
                return crudStrategy.createEntity.apply(crudStrategy, arguments);
            },
            readEntity: function () {
                checkReadPermission();
                return crudStrategy.readEntity.apply(crudStrategy, arguments);
            },
            updateEntity: function () {
                checkWritePermission();
                return crudStrategy.updateEntity.apply(crudStrategy, arguments);
            },
            deleteEntity: function () {
                checkWritePermission();
                return crudStrategy.deleteEntity.apply(crudStrategy, arguments);
            }
        };

        function checkReadPermission() {
            var user = injection.inject('User');
            if (!entityDescriptionService.userHasReadAccess(crudId, user)) {
                throw new appUtil.ForbiddenError('Read permission to ' + JSON.stringify(crudId) + ' denied for ' + user.username);
            }
        }

        function checkWritePermission() {
            var user = injection.inject('User');
            if (!entityDescriptionService.userHasWriteAccess(crudId, user)) {
                throw new appUtil.ForbiddenError('Write permission to ' + JSON.stringify(crudId) + ' denied for ' + user.username);
            }
        }
    }

    return service;
};