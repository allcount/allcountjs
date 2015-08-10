var _ = require('underscore');

module.exports = function (app, webhookService) {
    var route = {};

    route.configure = function () {
        _.forEach(webhookService.webhookPathToHandler, function (handler, methodAndPath) {
            var splittedMethodAndPath = methodAndPath.split("=");
            var method, path;
            if (splittedMethodAndPath.length > 1) {
                method = splittedMethodAndPath[0].toLowerCase();
                path = splittedMethodAndPath[1];
            } else {
                method = "get";
                path = splittedMethodAndPath[0];
            }
            app[method](path, handler);
        })
    };

    return route;
};