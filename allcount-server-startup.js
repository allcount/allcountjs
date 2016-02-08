var _ = require('underscore');
var Q = require('q');

module.exports = function (gitRepoUrl, proxyHandler, injection, httpServer, app, storageDriver) {
    return {
        startup: function (onReady) {
            var self = this;
            var promise = this.reload().then(function () {
                var deferred = Q.defer();
                self.server = httpServer(function (req, res) {
                    proxyHandler(req, res, function () {
                        app(req, res);
                    });
                }, function() {
                    console.log('Application server for "' + gitRepoUrl + '" listening on port ' + app.get('port'));
                    deferred.resolve();
                });
                return deferred.promise;
            });
            if (onReady) {
                promise.then(function () {
                    onReady();
                }, function (err) {
                    onReady(err);
                }).done();
            }
            return promise;
        },
        reload: function () {
            app._router = null;
            injection.bindFactory('app', function () {
                return app;
            });
            var appService = injection.inject('appService');
            var appSetup = injection.inject('appSetup');
            return appService.compile().then(function () {
                return appSetup
                    .map(function (setup) { return function () { return setup.setup() } })
                    .reduce(Q.when, Q(null))
            });
        },
        tearDown: function () {
            return injection.inject('appSetup')
                .map(function (setup) { return function () { return setup.tearDown && setup.tearDown() } })
                .reduce(Q.when, Q(null))
        },
        stop: function () {
            var self = this;
            console.log("Shutting down HTTP server...");
            return this.tearDown().then(function () {
                var defer = Q.defer();
                self.server.close(function () {
                    defer.resolve(null);
                });
                return defer.promise.then(function () {
                    console.log("Closing db connection...");
                    return storageDriver.closeConnection();
                }).then(function () {
                    console.log('Application server for "' + gitRepoUrl + '" on port ' + app.get('port') + ' has stopped');
                })
            })
        }
    }
};

