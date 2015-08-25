'use strict';
var _ = require('lodash');
var Q = require('q');

module.exports = function (entityDescriptionService, Crud) {
    var service = {};

    service.isEntityReferenced = function (entityId, crudId) {

        var referenceFieldNamesFromDescription = function (description) {
            var fieldIsNotReferenceToThisEntityType = function (field) {
                return (field.fieldType.id !== 'reference' || field.fieldType.referenceEntityTypeId !== crudId.entityTypeId)
            };
            return _.keysIn(_.omit(description.allFields, fieldIsNotReferenceToThisEntityType));
        };

        var queryForReferencingFields = function (fields) {
            var query = {};
            if (fields.length === 1) {
                query[fields[0] + '.id'] = entityId;
            } else {
                query['$or'] = fields.map(function (field) {
                    var expression = {};
                    expression[field + '.id'] = entityId;
                    return expression;
                });
            }
            return query;
        };

        var entityTypesAndFieldsToCountOfReferencingObjects = function (entityTypeAndFields) {
            var entityType = entityTypeAndFields[0];
            var fields = entityTypeAndFields[1];

            var countMoreThanZero = function (count) {
                return count > 0;
            };

            return Crud.crudForEntityType(entityType).
                findCount({query: queryForReferencingFields(fields)}).
                then(countMoreThanZero);
        };

        var entityTypesWithoutReferencingFields = function (entityTypeAndFields) {
            return entityTypeAndFields[1].length > 0;
        };

        var countsOfReferencingObjects =
            _.pairs(_.mapValues(entityDescriptionService.entityDescriptions, referenceFieldNamesFromDescription)).
                filter(entityTypesWithoutReferencingFields).
                map(entityTypesAndFieldsToCountOfReferencingObjects);

        var checkPresenceOfTrue = function (results) {
            return results.indexOf(true) >= 0;
        };

        return Q.all(countsOfReferencingObjects).then(checkPresenceOfTrue);
    };

    return service;
};