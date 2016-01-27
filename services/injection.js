var _ = require("underscore");
var fs = require('fs');
var path = require('path');

exports.lookup = function (serviceName) {
    if (!serviceName.match(/^[A-Z]\w*$/)) {
        throw new Error("Can't resolve '" + serviceName + "'. Only AllcountJS API services could be resolved in app configuration JS. API services names should start with uppercase letter.");
    }
    return exports.inject(serviceName);
};

function camelHumpsToWireName(name) {
    return name.replace(/[A-Z0-9]/g, '-$&').toLowerCase();
}

exports.camelHumpsToWireName = camelHumpsToWireName;

var cycleDependencyGuardStack = [];

exports.addNameMatcher = function (regex, replaceFun, requireFn) {
    exports.nameMatchers.unshift({regex: regex, replaceFun: replaceFun, requireFn: requireFn});
};

exports.resolveFactory = function (factory) {
    var instance;
    if (_.isFunction(factory)) {
        instance = exports.resolveFuncArgs(factory, exports.inject);
    } else if (_.isArray(factory)) {
        instance = factory.map(exports.inject);
    } else {
        instance = factory;
    }
    return instance;
};

exports.Provider = function (factory) {
    this.get = factory;
};

exports.inject = function (serviceName, optional) {
    if (serviceName === 'injection') {
        return exports;
    }
    if (cycleDependencyGuardStack.indexOf(serviceName) != -1) {
        throw new Error('Cycle dependency detected: ' + cycleDependencyGuardStack.join(', ') + ', >>> ' + serviceName);
    }
    cycleDependencyGuardStack.push(serviceName);
    function resolve(serviceName) {
        if (exports.providers[serviceName] instanceof exports.Provider) {
            return exports.providers[serviceName].get();
        } else {
            return exports.providers[serviceName];
        }
    }
    try {
        if (exports.scoped.length > 0 && exports.scoped[exports.scoped.length - 1].providers[serviceName]) {
            return exports.scoped[exports.scoped.length - 1].providers[serviceName];
        }
        var factory;
        var scoped = exports.findInScope(serviceName);
        if (!_.isUndefined(scoped)) {
            if (_.isString(scoped)) {
                factory = requireWithServiceNameMatcher(scoped);
            } else {
                factory = scoped
            }
        } else if (exports.providers[serviceName]) {
            return resolve(serviceName);
        } else if (exports.factories[serviceName]) {
            factory = exports.factories[serviceName];
        } else {
            factory = requireWithServiceNameMatcher(serviceName);
        }
        if (_.isUndefined(factory)) {
            if (optional) {
                return undefined;
            }
            throw new Error('No factory found for "' + serviceName + '". Injection stack: ' + cycleDependencyGuardStack.join(', '));
        }
        var instance = exports.resolveFactory(factory);
        if (exports.scoped.length > 0) {
            exports.scoped[exports.scoped.length - 1].providers[serviceName] = instance;
            return instance;
        } else {
            exports.providers[serviceName] = instance;
        }
        return resolve(serviceName);
    } finally {
        cycleDependencyGuardStack.pop();
    }
};

exports.storeScope = function () {
    return _.clone(exports.scoped);
};

exports.restoreScope = function (storedScope, fn) {
    var oldScoped = exports.scoped;
    exports.scoped = storedScope;
    var result;
    try {
        result = fn();
    } finally {
        exports.scoped = oldScoped;
    }
    return result;
};

function requireWithServiceNameMatcher(serviceName) {
    var matcher = _.find(exports.nameMatchers, function (matcher) { return serviceName.match(matcher.regex)});
    var servicePath;
    return matcher && (servicePath = matcher.replaceFun(serviceName)) && matcher.requireFn(servicePath) || undefined;
}

exports.bindFactory = function (serviceName, factory) {
    exports.factories[serviceName] = factory;
};

exports.overrideFactory = function (serviceName, renameOldServiceTo, factory) {
    var oldService = exports.factories[serviceName] || serviceName;
    var scope = {};
    scope[renameOldServiceTo] = oldService;
    exports.factories[serviceName] = function (injection) {
        return injection.inScope(scope, function () {
            return exports.resolveFactory(factory);
        });
    }
};

exports.inScope = function (serviceNameToFactory, fun) {
    exports.scoped.push({factories: serviceNameToFactory, providers: {}});
    var result;
    try {
        result = fun();
    } finally {
        exports.scoped.pop();
    }
    return result;
};

exports.findInScope = function (serviceName) {
    for (var i = exports.scoped.length - 1; i >= 0; i--) {
        var res = _.find(exports.scoped[i].factories, function (factory, name) {
            return name === serviceName;
        });
        if (res) {
            return res;
        }
    }
    return undefined;
};

exports.bindMultiple = function (serviceName, serviceNames) {
    if (!exports.factories[serviceName]) {
        exports.factories[serviceName] = [];
    }
    exports.factories[serviceName].push.apply(exports.factories[serviceName], serviceNames);
};

exports.bindMultipleBefore = function (serviceName, beforeServiceName, serviceNames) {
    var insertIndex;
    if (!exports.factories[serviceName] || (insertIndex = exports.factories[serviceName].indexOf(beforeServiceName)) === -1) {
        throw new Error("'" + beforeServiceName + "' not found in '" + serviceName + "'");
    }
    exports.factories[serviceName].splice.apply(exports.factories[serviceName], _.union([insertIndex, 0], serviceNames));
};

var FunctionRegex = /function\s*\(([\s\S]*?)\)\s*{[\s\S]+?}/;

exports.resolveFuncArgs = function (func, resolver) {
    var match = func.toString().match(FunctionRegex);
    if (match && match[1]) {
        var args = match[1].split(',');
        var resolved = args.map(function (item) {
            return resolver(item.trim());
        });
        return func.apply(null, resolved);
    } else if (match) {
        return func();
    } else
        throw new Error("Can't match args for: " + func.toString());
};

exports.resetInjection = function () {
    exports.providers = {};
    exports.factories = {};
    exports.scoped = [];
    exports.nameMatchers = [];

    exports.addNameMatcher(/.*/, function (serviceName) {
        if (fs.existsSync(path.join(__dirname, camelHumpsToWireName(serviceName) + '.js'))) {
            return './' + camelHumpsToWireName(serviceName) + '.js';
        }
    }, require);

    exports.addNameMatcher(/^[A-Z]\w*$/, function (serviceName) {
        if (fs.existsSync(path.join(__dirname, 'js', serviceName + '.js'))) {
            return './js/' + serviceName + '.js';
        }
    }, require);
};

exports.initializeScopedThen = function (Q) {
    if (Q.makePromise.prototype.scopedThenInitialized) {
        return;
    }
    var superThen = Q.makePromise.prototype.then;
    Q.makePromise.prototype.then = function () {
        var storedScope = exports.storeScope();

        return superThen.apply(this, _.map(arguments, function (fn) {
            return _.isFunction(fn) && function () {
                    var resolveArgs = arguments;
                    return exports.restoreScope(storedScope, function () { return fn.apply(null, resolveArgs) });
                } || fn;
        }));
    };
    var superNodeify = Q.makePromise.prototype.nodeify;
    Q.makePromise.prototype.nodeify = function () {
        var storedScope = exports.storeScope();

        return superNodeify.apply(this, _.map(arguments, function (fn) {
            return _.isFunction(fn) && function () {
                    var resolveArgs = arguments;
                    return exports.restoreScope(storedScope, function () { return fn.apply(null, resolveArgs) });
                } || fn;
        }));
    };
    Q.makePromise.prototype.scopedThenInitialized = true;
};

exports.installModule = function (module) {
    if (module.installModule) {
        module.installModule(this);
    }
};

exports.installModulesFromPackageJson = function (packageJsonFilePath) {
    var packageJson = JSON.parse(fs.readFileSync(packageJsonFilePath));
    var allcountjsModules = packageJson.allcountjsModules;
    if (allcountjsModules && _.isArray(allcountjsModules)) {
        allcountjsModules.forEach(function (moduleName) {
            exports.installModule(require(moduleName));
        });
    } else {
        packageJson.dependencies = packageJson.dependencies || {};
        _.forEach(packageJson.dependencies, function (version, name) {
            if (name.indexOf("allcountjs-") === 0) {
                exports.installModule(require(name));
            }
        })
    }
};

exports.resetInjection();