var _ = require('underscore');

module.exports = function (app, repositoryService, viewPaths) {
    return {
        setup: function () {
            app.set('views', _.union([repositoryService.repositoryDir()], _.flatten(viewPaths.reverse())));
        }
    };
};