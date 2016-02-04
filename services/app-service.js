var _ = require('underscore');
var Q = require('q');
var util = require('util');

module.exports = function (compileServices, appUtil, configObjectProviders) {
    return {
        compileObjects: function (objects, errorsReport, callback) {
            var promise = compileServices
                .map(function (compileService) {
                    return function () {
                        return compileService.compile(objects, errorsReport)
                    }
                })
                .reduce(Q.when, Q(null))
                .catch(function (error) {
                    if (error instanceof appUtil.CompileError) {
                        errorsReport.error(error.message);
                    } else {
                        errorsReport.error(error.stack);
                    }
                })
                .then(function () {
                    if (errorsReport.errors.length > 0) {
                        throw errorsReport.errors;
                    }
                });
            if (callback) {
                promise.then(function () {
                    callback([]);
                }).catch(function (err) {
                    callback(err);
                });
            }
            return promise;
        },
        compile: function (callback) {
            var self = this;
            var errorsReport = {
                errors: [],
                error: function () {
                    this.errors.push(util.format.apply(util.format, arguments));
                }
            };
            var promise = Q.all(configObjectProviders.map(function (provider) {
                return Q(provider.configObjects(errorsReport));
            })).then(function (objectsByProvider) {
                var objects = _.flatten(objectsByProvider, true);
                return self.compileObjects(objects, errorsReport);
            });

            if (callback) {
                promise.then(function () {
                    callback([]);
                }).catch(function (err) {
                    callback(err);
                });
            }

            return promise;
        }
    };
};

