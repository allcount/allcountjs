module.exports = function (entityDescriptionService) {
    return {
        extractEntityCrudId: function (req) {
            if (req.query.entityCrudId) {
                return JSON.parse(req.query.entityCrudId);
            } else if (req.params.entityTypeId) {
                return entityDescriptionService.entityTypeIdCrudId(req.params.entityTypeId);
            }
        }
    }
};