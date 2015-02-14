var _ = require('underscore');

module.exports = function (entityDescriptionService, layoutService) {
    var route = {};

    route.fieldDescriptions = function (req, res) {
        res.json(entityDescriptionService.fieldDescriptions(req.body.entityCrudId));
    };

    route.permissions = function (req, res) {
        res.json({
            read: entityDescriptionService.userHasReadAccess(req.body.entityCrudId, req.user),
            write: entityDescriptionService.userHasWriteAccess(req.body.entityCrudId, req.user),
            create: entityDescriptionService.userHasCreateAccess(req.body.entityCrudId, req.user),
            update: entityDescriptionService.userHasUpdateAccess(req.body.entityCrudId, req.user),
            delete: entityDescriptionService.userHasDeleteAccess(req.body.entityCrudId, req.user)
        })
    };

    route.layout = function (req, res) {
        res.json(layoutService.layoutFor(req.params.entityTypeId));
    };

    return route;
};