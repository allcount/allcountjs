var _ = require('underscore');
module.exports = function (entityDescriptionService, appUtil) {
    return {
        validateEntity: function (entityCrudId, entity, definedFieldsOnly) {
            var service = this;
            var entityDescription = entityDescriptionService.entityDescription(entityCrudId);
            var fieldNameToMessage = _.chain(entityDescription.allFields).map(function (field, fieldName) {
                var message = !definedFieldsOnly || definedFieldsOnly && !_.isUndefined(entity[fieldName]) ? service.validateField(field, entity[fieldName]) : undefined;
                if (message) {
                    return [fieldName, message];
                }
                return undefined;
            }).filter(_.identity).object().value();
            if (_.size(fieldNameToMessage) > 0) {
                throw new appUtil.ValidationError(fieldNameToMessage);
            }
        },
        validateField: function (field, fieldValue) {
            if (field.isRequired && (_.isUndefined(fieldValue) || _.isNull(fieldValue))) {
                return "Required";
            }
            return undefined;
        }
    };
};