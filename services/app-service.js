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
                                    objects.push(appService.evaluateObject(obj));
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
        },
        evaluateObject: function (object) {
            var result;
            if (_.isFunction(object)) {
                result = appService.evaluateObject(injection.resolveFuncArgs(object, injection.lookup));
            } else if (_.isArray(object)) {
                result = object.map(function (i) { return appService.evaluateObject(i)});
            } else if (Q.isPromise(object) || object && object.then) {
                result = Q(object); //TODO .then(evaluateObject) ?
            } else if (_.isObject(object)) {
                result = new ConfigObject(object);
            }  else {
                result = object;
            }
            return result;
        }
    };

    function ConfigObject(obj) {
        this.obj = obj;
    }

    ConfigObject.prototype = {
        propertyValue: function (name) {
            return appService.evaluateObject(this.obj[name]);
        },

        hasPropertyValue: function (name) {
            return !!this.obj[name];
        },

        propertyValues: function () {
            var self = this;
            var results = {};
            _.forEach(this.obj, function (prop, name) {
                results[name] = self.propertyValue(name);
            });
            return results;
        },

        evaluateProperties: function () {
            function evaluateNext(next) {
                if (_.isArray(next)) {
                    return next.map(evaluateNext);
                } else if (next && next.obj) {
                    var result = {};
                    for (var prop in next.obj) {
                        if (next.obj.hasOwnProperty(prop)) {
                            result[prop] = evaluateNext(next.propertyValue(prop));
                        }
                    }
                    return result;
                } else {
                    return next;
                }
            }

            return evaluateNext(this);
        },

        withParent: function (configObject) {
            function ViewConfigConstructor() {}
            ViewConfigConstructor.prototype = configObject.obj;
            var objWithParent = new ViewConfigConstructor();
            return new ConfigObject(_.extend(objWithParent, this.obj));
        },

        arrayPropertyValue: function (name) {
            return this.assertPropertyValue(name, _.isArray, 'Property value "%s" expected to be an array');
        },

        stringPropertyValue: function (name) {
            return this.assertPropertyValue(name, _.isString, 'Property value "%s" expected to be a string');
        },

        assertPropertyValue: function (name, assertFun, errorMsg) {
            var propertyValue = this.propertyValue(name);
            if (!propertyValue) {
                return propertyValue;
            }
            if (!assertFun(propertyValue)) {
                throw new appUtil.CompileError(errorMsg, name);
            }
            return propertyValue;
        }
    };

    return appService;
};

