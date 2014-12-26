var _ = require('underscore');

module.exports = function (templateVarService, entityDescriptionService) {
    var entityRoutes = {};

    entityRoutes.entity = function (req, res) {
        if (entityDescriptionService.userHasReadAccess({entityTypeId: req.params.entityTypeId}, req.user)) {
            templateVarService.setupLocals(req, res);
            var entityDescription = entityDescriptionService.entityDescription(entityDescriptionService.entityTypeIdCrudId(req.params.entityTypeId));
            res.render(entityDescription.customView ||'entity');
        } else {
            res.loginOrForbidden();
        }
    };

    return entityRoutes;
};