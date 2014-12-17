module.exports = function (menuService) {
    var service = {};

    service.menus = function (req, res) {
        res.json(menuService.menus(req.user));
    };

    return service;
};