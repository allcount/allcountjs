var _ = require('underscore');

module.exports = function (crudStrategies) {
    var service = {};

    service.strategyForCrudId = function (crudId) {
        return _.map(crudStrategies, function (strategy) {
            return strategy.crudHandlerFor(crudId);
        })[0];
    };

    return service;
};