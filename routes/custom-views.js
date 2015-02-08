var _ = require('underscore');
var marked = require('marked');

module.exports = function (viewService, repositoryService, templateVarService) {
    var service = {};

    service.setupCustomViews = function (route) {
        _.forEach(viewService.views, function (viewConfig, path) {
            viewConfig.renderer.then(function (renderer) {
                route.get(path, function (req, res, next) {
                    templateVarService.setupLocals(req, res);
                    renderer.render(req, res, next);
                });
            }).done();
        });
    };

    return service;
};