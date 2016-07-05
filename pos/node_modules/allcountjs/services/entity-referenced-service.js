'use strict';
var _ = require('lodash');
var Q = require('q');

module.exports = function (entityDescriptionService, crudService) {
    var service = {};

    /**
     * @param entityId
     * @param crudId
     * @return Array of tuples mapping entity type id to referencing field names: [[String, [String]]]. For example: [['EntityTypeId1', ['fooField1', 'barField2']], ['EntityTypeId2', ['fooField2']], ...]. Or [] if no such entity types.
     */
    service.referencingEntitiesWithFieldNames = function (entityId, crudId) {
        var filterNotReferencingFields = function (entityTypeAndFields) {
            var entityType = entityTypeAndFields[0];
            var fields = entityTypeAndFields[1];
            var crud = strategyForEntityType(entityType);

            return Q.all(fields.map(function (field) {
                return crud.findCount({query: queryForReferencingFields(entityId)([field])}).
                    then(function (result) {
                        if (result) return field;
                    });
            })).then(function (fields) {
                return [entityType, fields.filter(function (field) {
                    return !_.isUndefined(field)
                }).map(function (field) {
                    return field.name;
                })];
            });
        };

        var entityTypesToActualReferencingFields = allReferencingEntityTypesAndFields(crudId).
            map(filterNotReferencingFields);

        var filterTypesWithoutActuallyReferencingFields = function (referencingEntityTypesAndFields) {
            return referencingEntityTypesAndFields.filter(function (entityTypeAndFields) {
                return entityTypeAndFields[1].length > 0;
            });
        };

        return Q.all(entityTypesToActualReferencingFields).then(filterTypesWithoutActuallyReferencingFields);
    };

    var strategyForEntityType = function (entityType) {
        return crudService.strategyForCrudId(entityDescriptionService.entityTypeIdCrudId(entityType));
    };

    var referenceFieldsFromDescription = function (crudId) {
        return function (description) {
            var fieldIsNotReferenceToThisEntityType = function (field) {
                return (field.fieldType.id !== 'reference' || field.fieldType.referenceEntityTypeId !== crudId.entityTypeId)
            };
            return _.valuesIn(_.mapValues(_.omit(description.allFields, fieldIsNotReferenceToThisEntityType), function (field, id) {
                return {
                    name: field.name || id,
                    id: id
                };
            }));
        };
    };

    var entityTypesWithoutReferencingFields = function (entityTypeAndFields) {
        return entityTypeAndFields[1].length > 0;
    };

    var allReferencingEntityTypesAndFields = function (crudId) {
        return _.pairs(_.mapValues(entityDescriptionService.entityDescriptions, referenceFieldsFromDescription(crudId))).
            filter(entityTypesWithoutReferencingFields);
    };

    var queryForReferencingFields = function (entityId) {
        return function (fields) {
            var fieldIds = fields.map(function (field) {
                return field.id;
            });
            var query = {};
            if (fieldIds.length === 1) {
                query[fieldIds[0] + '.id'] = entityId;
            } else {
                query['$or'] = fieldIds.map(function (field) {
                    var expression = {};
                    expression[field + '.id'] = entityId;
                    return expression;
                });
            }
            return query;
        };
    };

    service.isEntityReferenced = function (entityId, crudId) {

        var entityTypesAndFieldsToCountOfReferencingObjects = function (entityTypeAndFields) {
            var entityType = entityTypeAndFields[0];
            var fields = entityTypeAndFields[1];

            var countMoreThanZero = function (count) {
                return count > 0;
            };

            return strategyForEntityType(entityType).
                findCount({query: queryForReferencingFields(entityId)(fields)}).
                then(countMoreThanZero);
        };


        var countsOfReferencingObjects = allReferencingEntityTypesAndFields(crudId).map(entityTypesAndFieldsToCountOfReferencingObjects);

        var checkPresenceOfTrue = function (results) {
            return results.indexOf(true) >= 0;
        };

        return Q.all(countsOfReferencingObjects).then(checkPresenceOfTrue);
    };

    return service;
};