module.exports = function (menuService) {
    var service = {};

    service.menus = function (req, res) {
        res.json(menuService.menus(req.user));
    };

    service.appInfo = function (req, res) { //TODO send all info in one round-trip?
        res.json({
            appName: menuService.appName(),
            appIcon: menuService.appIcon()
        })
    };

    return service;
};