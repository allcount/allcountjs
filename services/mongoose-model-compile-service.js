var _ = require('underscore');
var Q = require('q');
var moment = require('moment');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
require('mongoose-long')(mongoose);

module.exports = function (storageDriver) {
    return {
        entity: function (entityTypeId, persistenceEntityTypeId) {
            return {
                fields: function (fields) {
                    if (!storageDriver.mongooseModels()) {
                        return;
                    }

                    var self = this;

                    var definition = _.chain(fields.evaluateProperties()).map(function (field, fieldName) {
                        if (field.fieldType.notPersisted) {
                            return undefined;
                        }
                        var fieldType;
                        if (self.fieldTypes[field.fieldType.id]) {
                            fieldType = self.fieldTypes[field.fieldType.id](field, fieldName);
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
                },
                fieldTypes: {
                    date: function () {
                        return Date;
                    },
                    reference: function () {
                        return {id: Schema.ObjectId, name: String};
                    },
                    multiReference: function () {
                        return [{id: Schema.ObjectId, name: String}];
                    },
                    attachment: function () {
                        return {}; // allow to save attachments in different storage providers
                    },
                    integer: function () {
                        return Number;
                    },
                    money: function () {
                        return Schema.Types.Long;
                    },
                    checkbox: function (field) {
                        if (field.fieldType.storeAsArrayField) {
                            return [field.fieldType.storeAsArrayField, [String]];
                        } else {
                            return Boolean;
                        }
                    }
                }
            }
        }
    }
};