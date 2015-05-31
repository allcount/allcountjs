var _ = require('underscore');

module.exports = function (entityDescriptionService, layoutService, routeUtil, menuService) {
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

    route.entityDescription = function (req, res) { //TODO load all descriptions in one round-trip?
        var entityCrudId = routeUtil.extractEntityCrudId(req);
        var entityDescription = entityDescriptionService.entityDescription(entityCrudId);
        res.json({
            title: entityDescription.title || entityCrudId.entityTypeId && findTitle(menuService.menus(req.user), entityCrudId.entityTypeId),
            referenceNameExpression: entityDescription.referenceNameExpression
        })
    };

    function findTitle(menus, entityTypeId) {
        var menu = _.find(menus, function (menu) {
            return menu.entityTypeId === entityTypeId;
        });
        return menu && menu.name || menus.map(function (menu) {
            return menu.children && findTitle(menu.children, entityTypeId)
        }).filter(_.identity)[0];
    }

    return route;
};