var _ = require('underscore');

module.exports = function (entityDescriptionService, layoutService, routeUtil) {
    var route = {};

    route.fieldDescriptions = function (req, res) {
        res.json(entityDescriptionService.fieldDescriptions(routeUtil.extractEntityCrudId(req)));
    };

    route.permissions = function (req, res) {
        res.json({
            read: entityDescriptionService.userHasReadAccess(routeUtil.extractEntityCrudId(req), req.user),
            write: entityDescriptionService.userHasWriteAccess(routeUtil.extractEntityCrudId(req), req.user),
            create: entityDescriptionService.userHasCreateAccess(routeUtil.extractEntityCrudId(req), req.user),
            update: entityDescriptionService.userHasUpdateAccess(routeUtil.extractEntityCrudId(req), req.user),
            delete: entityDescriptionService.userHasDeleteAccess(routeUtil.extractEntityCrudId(req), req.user)
        })
    };

    route.layout = function (req, res) {
        res.json(layoutService.layoutFor(req.params.entityTypeId));
    };

    return route;
};