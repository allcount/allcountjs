var _ = require('underscore');
var marked = require('marked');

module.exports = function (viewService, repositoryService, templateVarService) {
    var service = {};

    service.setupCustomViews = function (route) {
        _.forEach(viewService.views, function (viewConfig, path) {
            repositoryService.loadFileFromRepo(viewConfig.fileName).then(function (viewContent) {
                route.get(path, function (req, res) {
                    templateVarService.setupLocals(req, res, _.extend(viewConfig.locals || {}, viewConfig.fileProcessor(viewContent)));
                    res.render(viewConfig.view);
                });
            }).done();
        });
    };

    return service;
};