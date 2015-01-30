var vm = require('vm');
var _ = require('underscore');
var Q = require('q');
var util = require('util');
var syntaxCheck = require('syntax-error');

module.exports = function (compileServices, repositoryService, injection, appUtil) {
    var appService = {
        compile: function (callback) {
            var errorsReport = {
                errors: [],
                error: function () {
                    this.errors.push(util.format.apply(util.format, arguments));
                }
            };

            repositoryService.configFiles(function (files) {
                var objects = [];
                files.forEach(function (file) {
                    var err = syntaxCheck(file.content, file.fileName);
                    if (err) {
                        errorsReport.error(err.toString());
                    } else {
                        try {
                            vm.runInNewContext(file.content, {A: {
                                app: function (obj) {
                                    objects.push(appUtil.evaluateObject(obj));
                                }
                            }}, file.fileName);
                        } catch (e) {
                            errorsReport.error(e.stack);
                        }
                    }
                });
                if (errorsReport.errors.length > 0) {
                    callback(errorsReport.errors);
                    return;
                }
                compileServices
                    .map(function (compileService) { return function () { return compileService.compile(objects, errorsReport) } })
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
            });
        }
    };

    return appService;
};

