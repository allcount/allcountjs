var _ = require('underscore');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = function (storageDriver, mongoFieldService) {
    return {
        entity: function (entityTypeId, persistenceEntityTypeId) {
            return {
                systemFields: {
                    createTime: {
                        fieldType: {
                            id: 'date'
                        }
                    },
                    modifyTime: {
                        fieldType: {
                            id: 'date'
                        }
                    }
                },
                fields: function (fields) {
                    if (!storageDriver.mongooseModels) {
                        return;
                    }

                    var definition = _.chain(_.extend({}, fields.evaluateProperties(), this.systemFields)).map(function (field, fieldName) {
                        if (field.fieldType.notPersisted) {
                            return undefined;
                        }
                        var fieldType, schemaFn;
                        if (schemaFn = mongoFieldService.fieldTypes[field.fieldType.id] &&
                            mongoFieldService.fieldTypes[field.fieldType.id].schema
                        ) {
                            fieldType = schemaFn(field, fieldName);
                            if (_.isArray(fieldType) && fieldType.length === 2) {
                                fieldName = fieldType[0];
                                fieldType = fieldType[1];
                            }
                        } else {
                            fieldType = String;
                        }
                        if (field.isUnique) {
                            fieldType = {type: fieldType, index: { unique: true }};
                        }
                        return [fieldName, fieldType];
                    }).filter(_.identity).object().value();
                    definition.__textIndex = [String];
                    var schema = new Schema(definition, {
                        collection: persistenceEntityTypeId || entityTypeId //TODO doubling?
                    });
                    storageDriver.mongooseModels()[entityTypeId] = storageDriver.mongooseConnection().model(entityTypeId, schema);
                }
            }
        }
    }
};