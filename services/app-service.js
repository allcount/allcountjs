var _ = require('underscore');
var Q = require('q');
var util = require('util');

module.exports = function (compileServices, appUtil, configObjectProviders) {
    return {
        compileObjects: function (objects, errorsReport, callback) {
            compileServices
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
                    callback(errorsReport.errors);
                }).done();
        },
        compile: function (callback) {
            var self = this;
            var errorsReport = {
                errors: [],
                error: function () {
                    this.errors.push(util.format.apply(util.format, arguments));
                }
            };
            return Q.all(configObjectProviders.map(function (provider) {
                return Q(provider.configObjects(errorsReport));
            })).then(function (objectsByProvider) {
                var objects = _.flatten(objectsByProvider, true);
                if (errorsReport.errors.length > 0) {
                    callback(errorsReport.errors);
                    return;
                }
                self.compileObjects(objects, errorsReport, callback);
            });
        }
    };
};

