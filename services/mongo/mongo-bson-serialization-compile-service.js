var _ = require('underscore');

module.exports = function (storageDriver, mongoFieldService) {
    return {
        entity: function (entityTypeId, persistenceEntityTypeId) {
            return {
                fields: function (fields) {
                    if (!storageDriver.mongooseModels) {
                        return;
                    }

                    storageDriver.serializers[entityTypeId] = _.chain(fields.evaluateProperties()).map(function (field, fieldName) {
                        if (field.fieldType.notPersisted) {
                            return undefined;
                        }
                        var serializers, fieldType;
                        if (fieldType = mongoFieldService.fieldTypes[field.fieldType.id]) {
                            serializers = {toBsonValue: fieldType.toBsonValue, fromBsonValue: fieldType.fromBsonValue};
                        } else {
                            serializers = {toBsonValue: _.identity, fromBsonValue: _.identity};
                        }
                        return [fieldName, serializers];
                    }).filter(_.identity).object().value();
                }
            }
        }
    }
};