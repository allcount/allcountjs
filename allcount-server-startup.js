_ = require('underscore');

module.exports = function (appService, gitRepoUrl, proxyHandler, injection, httpServer, express) {
    return {
        startup: function (onReady) {
            appService.compile(function (errors) {
                if (errors.length > 0) {
                    if (onReady) {
                        onReady(errors);
                    }
                    throw new Error(errors.join('\n'));
                } else {
                    var app = express();

                    injection.inScope({
                        app: function () { return app }
                    }, function () {
                        injection.inject('appSetup').reverse().forEach(function (setup) { setup.setup() });
                    });
                }

                httpServer(function (req, res) {
                    proxyHandler(req, res, function () {
                        app(req, res);
                    });
                }, function() {
                    console.log('Application server for "' + gitRepoUrl + '" listening on port ' + app.get('port'));
                    if (onReady) {
                        onReady();
                    }
                });
            });
        }
    }
};

