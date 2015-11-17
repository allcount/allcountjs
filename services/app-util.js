var util = require('util');
var _ = require('underscore');
var Q = require('q');

module.exports = function (injection, ValidationError) {
    function CompileError () {
        this.message = util.format.apply(util.format, arguments);
        this.name = "CompileError";
        Error.captureStackTrace(this, arguments.callee);
    }

    util.inherits(CompileError, Error);

    function ForbiddenError (message) {
        this.message = message;
        Error.captureStackTrace(this, arguments.callee);
    }

    util.inherits(ForbiddenError, Error);

    function ConflictError (message) {
        this.message = message;
        Error.captureStackTrace(this, arguments.callee);
    }

    util.inherits(ConflictError, Error);

    function ConfigObject(obj) {
        this.obj = obj;
    }

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

    ConfigObject.prototype = {
        propertyValue: function (name) {
            return appUtil.evaluateObject(this.obj[name], this.obj.__proto__, name);
        },

        hasPropertyValue: function (name) {
            return !!this.obj[name];
        },

        hasOwnPropertyValue: function (name) {
            return this.obj.hasOwnProperty(name);
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

        evaluatedValue: function (name) {
            return evaluateNext(this.propertyValue(name));
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
        },

        invokePropertiesOn: function (invokeOn) {
            var self = this;
            _.forEach(invokeOn, function (method, name) {
                self.hasPropertyValue(name) && invokeOn[name](self.propertyValue(name));
            });
        }
    };

    var appUtil = {
        CompileError: CompileError,
        ValidationError: ValidationError,
        ConfigObject: ConfigObject,
        ForbiddenError: ForbiddenError,
        ConflictError: ConflictError,
        evaluateObject: function (object, parent, name) {
            var self = this;
            var result;
            if (_.isFunction(object)) {
                result = self.evaluateObject(injection.resolveFuncArgs(object, function (dependency) {
                    if (dependency === '$parentProperty') {
                        return parent && name && self.evaluateObject(parent[name], parent.__proto__, name).obj;
                    } else {
                        return injection.lookup(dependency);
                    }
                }));
            } else if (_.isArray(object)) {
                result = object.map(function (i) {
                    return self.evaluateObject(i)
                });
            } else if (_.isDate(object)) {
                return object;
            } else if (Q.isPromise(object) || object && object.then) {
                result = Q(object); //TODO .then(evaluateObject) ?
            } else if (_.isObject(object)) {
                result = new self.ConfigObject(object);
            } else {
                result = object;
            }
            return result;
        }
    };
    return appUtil;
};