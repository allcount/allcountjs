var _ = require('underscore');

module.exports = function (entityDescriptionService, viewService, linkBuilder) {
    var menuItems;

    var menuService = {};
    menuService.compile = function (objects, errors) {
        menuItems = _.flatten(objects.map(function (item) {
            return item.propertyValue('menuItems') && item.propertyValue('menuItems').map(function (i) { return i.evaluateProperties()}) || [];
        }));

        menuItems.forEach(menuService.compileCheck(errors));

        objects.forEach(function (obj) {
            var appName = obj.propertyValue('appName');
            if (appName) {
                exports.appNameValue = appName;
            }
            var appIcon = obj.propertyValue('appIcon');
            if (appIcon) {
                menuService.appIconValue = appIcon;
            }
            var appTitle = obj.propertyValue('appTitle');
            if (appTitle) {
                menuService.appTitle = appTitle;
            }
        });
    };

    menuService.compileCheck = function (errors) {
        return function compileCheckRecursive(item) {
            if (item.children) {
                if (item.entityTypeId || item.view) {
                    errors.error("Item '%s' has children and defines reference simultaneously", item.name);
                }
                item.children.forEach(compileCheckRecursive);
            } else if ((item.entityTypeId || item.view) && !(_.isString(item.entityTypeId) || _.isString(item.view))) {
                errors.error('Entity type or view references either should be string type');
            } else if (item.view && item.entityTypeId) { //TODO compile check
                errors.error("Item '%s' defines multiple references simultaneously", item.name);
            } else if (item.view && !viewService.views[item.view]) {
                errors.error("View '%s' referenced in item '%s' is not defined", item.view, item.name);
            } else if (item.entityTypeId && !entityDescriptionService.hasEntityDescription(item.entityTypeId)) {
                errors.error("Entity type '%s' referenced in item '%s' is not defined", item.entityTypeId, item.name);
            } else {
                item.url = linkBuilder.buildLinkTo(item);
            }
        }
    };

    menuService.menus = function (user) {
        return menuItems.map(menuService.filterMenus(user)).filter(function (menu) {return !!menu});
    };

    menuService.filterMenus = function (user) {
        return function filterMenusRecursive(item) {
            if (item.children) {
                var newItem = _.clone(item);
                newItem.children = item.children.map(filterMenusRecursive).filter(function (i) {
                    return !!i
                });
                return newItem.children.length > 0 ? newItem : undefined;
            } else if (item.view) { //TODO security
                return item;
            } else {
                return entityDescriptionService.userHasReadAccess({entityTypeId: item.entityTypeId}, user) ? item : undefined;
            }
        }
    };

    menuService.appName = function () {
        return exports.appNameValue;
    };

    menuService.appIcon = function () {
        return menuService.appIconValue;
    };

    return menuService;
};