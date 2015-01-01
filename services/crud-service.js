var _ = require('underscore');

module.exports = function (crudStrategies, storageDriver, entityDescriptionService) {
    var service = {};

    service.strategyForCrudId = function (crudId) {
        return _.map(crudStrategies, function (strategy) {
            return strategy.crudHandlerFor(crudId);
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

    return service;
};