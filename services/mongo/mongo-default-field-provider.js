var _ = require('underscore');
var moment = require('moment');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
require('mongoose-long')(mongoose);
var mongo = mongoose.mongo;

module.exports = function (storageDriver) {
    return {
        fieldTypes: function () {
            var toDbReference = function (value, fieldName) {
                if (!value.id) {
                    throw new Error("Reference value without id was passed for field '" + fieldName + "'"); //TODO mongoose returns empty objects for reference if it's undefined, Maybe return null here?
                }
                return {
                    id: storageDriver.toMongoId(value.id),
                    name: value.name
                }
            };
            return {
                date: {
                    schema: function () {
                        return Date;
                    },
                    toBsonValue: function (value, field, entity, fieldName) {
                        if (!value || _.isDate(value)) {
                            return value;
                        }
                        return moment(value, 'YYYY-MM-DD HH:mm:ss').toDate();
                    }
                },
                reference: {
                    schema: function () {
                        return {id: Schema.ObjectId, name: String};
                    },
                    toBsonValue: function (value, field, entity, fieldName) {
                        return value && toDbReference(value, fieldName);
                    },
                    fromBsonValue: function (value, field, entity, fieldName) {
                        return value && value.id ? {id: value.id.toString(), name: value.name} : undefined;
                    }
                },
                multiReference: {
                    schema: function () {
                        return [{id: Schema.ObjectId, name: String}];
                    },
                    toBsonValue: function (value, field, entity, fieldName) {
                        return value && value.map(function (v) { return toDbReference(v, fieldName) });
                    },
                    fromBsonValue: function (value, field, entity, fieldName) {
                        return value && value.map(function (v) { return {id: v.id.toString(), name: v.name}}) || undefined;
                    }
                },
                attachment: {
                    schema: function () {
                        return {}; // allow to save attachments in different storage providers
                    }
                },
                integer: {
                    schema: function () {
                        return Number;
                    }
                },
                number: {
                    schema: function () {
                        return Number;
                    }
                },
                money: {
                    schema: function () {
                        return Schema.Types.Long;
                    },
                    toBsonValue: function (value, field, entity, fieldName) {
                        return value && mongo.Long.fromString(value.toString());
                    },
                    fromBsonValue: function (value, field, entity, fieldName) {
                        return value && value.toString(10);
                    }
                },
                checkbox: {
                    schema: function (field) {
                        if (field.fieldType.storeAsArrayField) {
                            return [field.fieldType.storeAsArrayField, [String]];
                        } else {
                            return Boolean;
                        }
                    },
                    toBsonValue: function (value, field, entity, fieldName) {
                        if (field.fieldType.storeAsArrayField) {
                            if (!_.isUndefined(value)) {
                                return value ? {
                                    $$push: {
                                        field: field.fieldType.storeAsArrayField,
                                        value: field.name
                                    }
                                } : {
                                    $$pull: {
                                        field: field.fieldType.storeAsArrayField,
                                        value: field.name
                                    }
                                };
                            }
                        } else {
                            return value;
                        }
                    },
                    fromBsonValue: function (value, field, entity, fieldName) {
                        if (field.fieldType.storeAsArrayField) {
                            return entity[field.fieldType.storeAsArrayField] &&
                                _.isArray(entity[field.fieldType.storeAsArrayField]) &&
                                entity[field.fieldType.storeAsArrayField].indexOf(field.name) != -1
                        } else {
                            return value;
                        }
                    }
                },
                password: {
                    schema: function () {
                        return String;
                    },
                    toBsonValue: function (value, field, entity, fieldName) {
                        return value && storageDriver.passwordHash(entity.id, value);
                    },
                    fromBsonValue: function (value, field, entity, fieldName) {
                        return '';
                    }
                }

            }
        }
    }
};