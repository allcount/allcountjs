var _ = require('underscore');

module.exports = function () {
    return {
        referenceName: function (entityTypeId, entity) {
            return entity[this.entityTypeIdToReferenceName[entityTypeId]];
        },
        entityTypeIdToReferenceName: {},
        entity: function (entityTypeId) {
            var self = this;
            return {
                referenceName: function (referenceNameExpression) {
                    self.entityTypeIdToReferenceName[entityTypeId] = referenceNameExpression;
                }
            }
        }
    }
};