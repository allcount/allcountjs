var _ = require('underscore');

module.exports = function (entityDescriptionService, queryParseService, appUtil) {
    var service = {};

    service.compileValueSelect = function (rootEntityTypeId, valueSelectExpression) {
        return compileRecursive(queryParseService.parseValueExpression(valueSelectExpression));

        function compileRecursive(expression) {
            if (expression.fun) {
                if (expression.fun === 'sum' || expression.fun === 'count' || expression.fun === 'avg') {
                    if (expression.args.length !== 1) {
                        throw new appUtil.CompileError("Can't compile '%s': function %s expects only 1 arg", valueSelectExpression, expression.fun);
                    }
                    return {
                        fun: expression.fun,
                        value: compileRecursive(expression.args[0])
                    }
                } else {
                    throw new appUtil.CompileError("Can't compile '%s': unknown function '%s'", valueSelectExpression, expression.fun);
                }
            } else if (expression.path) {
                return {path: compilePath(rootEntityTypeId, expression.path) }; //TODO one-to-one/many
            } else {
                throw new appUtil.CompileError("Can't compile '%s': unknown expression '%s'", valueSelectExpression, JSON.stringify(expression));
            }
        }

        function compilePath(entityTypeId, path) {
            var entityDescription = entityDescriptionService.entityDescription(entityDescriptionService.entityTypeIdCrudId(entityTypeId));
            var fieldName = path[0];
            var field = entityDescription.allFields[ fieldName];
            if (!field) {
                throw new appUtil.CompileError("Can't compile '%s': '%s' field not found for '%s'", valueSelectExpression, fieldName, entityTypeId);
            }
            var pathElement;
            var relationEntityTypeId = field.referenceEntityTypeId();
            if (field.isForwardReference()) {
                pathElement = {
                    fieldName: fieldName,
                    filtering: function (fieldValue) {
                        return {
                            id: fieldValue
                        }
                    },
                    entityTypeId: relationEntityTypeId,
                    forward: true
//                    listenField: //TODO
                }
            } else if (field.isBackReference()) {
                pathElement = {
                    fieldName: fieldName,
                    filtering: function (fieldValue) {
                        return {
                            fieldName: fieldValue
                        }
                    },
                    entityTypeId: relationEntityTypeId,
                    forward: false,
                    backReferenceField: field.fieldType.backReferenceField
                }
            } else {
                pathElement = {
                    fieldName: fieldName
                }
            }
            if (path.length > 1) {
                if (!relationEntityTypeId) {
                    throw new appUtil.CompileError("Can't compile '%s': '%s' field is not relational", valueSelectExpression, fieldName);
                }
                return _.union([pathElement], compilePath(relationEntityTypeId, _.drop(path)))
            } else {
                return [pathElement];
            }
        }
    };



    return service;
};