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
                }

                appSetup
                    .map(function (setup) { return function () { return setup.setup() } })
                    .reduce(Q.when, Q(null))
                    .catch(function (error) {
                        if (onReady) {
                            onReady(error)
                        }
                        throw error;
                    }).then (function () {
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
                    }).done();
            });
        },
        stop: function () {
            var defer = Q.defer();
            console.log("Shutting down HTTP server...");
            this.server.close(function () {
                defer.resolve(null);
            });
            return defer.promise.then(function () {
                console.log("Closing db connection...");
                return storageDriver.closeConnection();
            }).then(function () {
                console.log('Application server for "' + gitRepoUrl + '" on port ' + app.get('port') + ' has stopped');
            })
        }
    }
};

