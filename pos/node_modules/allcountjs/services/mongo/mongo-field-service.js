var _ = require('underscore');

module.exports = function (mongoFieldProviders) {
    return {
        fieldTypes: _.chain(mongoFieldProviders).map(function (fieldProvider) {
            return _.map(fieldProvider.fieldTypes(), function (fieldType, fieldTypeId) { return [fieldTypeId, fieldType]});
        }).flatten(true).map(function (pair) {
            if (!pair[1].toBsonValue) {
                pair[1].toBsonValue = _.identity;
            }
            if (!pair[1].fromBsonValue) {
                pair[1].fromBsonValue = _.identity;
            }
            return pair;
        }).object().value()
    };
};