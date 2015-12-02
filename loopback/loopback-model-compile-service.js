var _ = require('underscore');

module.exports = function (loopback, loopbackApp) {
    return {
        entity: function (entityTypeId, persistenceEntityTypeId) {
            return {
                fields: function (fields) {
                    if (entityTypeId === 'User') {
                        return;
                    }
                    var fieldMappings = {
                        'text': 'string',
                        'password': 'string'
                    };
                    console.log('Loopback model: ' + entityTypeId);
                    loopbackApp.model(loopback.createModel({
                        "name": entityTypeId,
                        "base": "PersistedModel",
                        "idInjection": true,
                        "options": {
                            "validateUpsert": true
                        },
                        "properties": _.chain(fields.evaluateProperties()).map(function (field, fieldName) {
                            return [fieldName, {
                                type: fieldMappings[field.fieldType.id] || field.fieldType.id
                            }]
                        }).object().value(),
                        "validations": [],
                        "relations": {},
                        "acls": [],
                        "methods": {}
                    }), { dataSource: 'db' }); //TODO datasource
                }
            }
        }
    }
};