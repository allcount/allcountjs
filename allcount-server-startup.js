var _ = require('underscore');
var Q = require('q');

module.exports = function (appService, gitRepoUrl, proxyHandler, injection, httpServer, express, app, appSetup, storageDriver) {
    return {
        startup: function (onReady) {
            var self = this;
            appService.compile(function (errors) {
                if (errors.length > 0) {
                    if (onReady) {
                        onReady(errors);
                    }
                    throw new Error(errors.join('\n'));
                } else {
                    appSetup.forEach(function (setup) { setup.setup() });
                }

                self.server = httpServer(function (req, res) {
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
        },
        stop: function () {
            var defer = Q.defer();
            this.server.close(function () {
                console.log('Application server for "' + gitRepoUrl + '" on port ' + app.get('port') + ' has stopped');
                defer.resolve(null);
            });
            return defer.promise.then(function () {
                return storageDriver.closeConnection();
            });
        }
    }
};

