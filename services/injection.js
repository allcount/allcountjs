var _ = require("underscore");
var fs = require('fs');
var path = require('path');

exports.lookup = function (serviceName) {
    if (!serviceName.match(/^[A-Z]\w*$/)) {
        throw new Error("Can't resolve '" + serviceName + "'. Only AllcountJS API services could be resolved in app configuration JS.");
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

exports.inject = function (serviceName) {
    if (serviceName === 'injection') {
        return exports;
    }
    if (cycleDependencyGuardStack.indexOf(serviceName) != -1) {
        throw new Error('Cycle dependency detected: ' + cycleDependencyGuardStack.join(', ') + ', >>> ' + serviceName);
    }
    cycleDependencyGuardStack.push(serviceName);
    function resolve(serviceName) {
        if (exports.providers[serviceName].get) {
            return exports.providers[serviceName].get();
        } else {
            return exports.providers[serviceName];
        }
    }
    try {
        if (exports.scoped.length > 0 && exports.scoped[exports.scoped.length - 1].providers[serviceName]) {
            return exports.scoped[exports.scoped.length - 1].providers[serviceName];
        }
        if (exports.providers[serviceName]) {
            return resolve(serviceName);
        }
        var factory;
        var scoped = exports.findInScope(serviceName);
        if (scoped) {
            factory = scoped
        } else if (exports.factories[serviceName]) {
            factory = exports.factories[serviceName];
        } else if (exports.multipleBindings[serviceName]) {
            factory = exports.multipleBindings[serviceName];
        } else {
            factory = requireWithServiceNameMatcher(serviceName);
        }
        if (!factory) {
            throw new Error('No factory found for "' + serviceName + '". Injection stack: ' + cycleDependencyGuardStack.join(', '));
        }
        var instance;
        if (_.isFunction(factory)) {
            instance = exports.resolveFuncArgs(factory, exports.inject);
        } else if (_.isArray(factory)) {
            instance = factory.map(exports.inject).reverse();
        } else {
            instance = factory;
        }
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

function requireWithServiceNameMatcher(serviceName) {
    var matcher = _.find(exports.nameMatchers, function (matcher) { return serviceName.match(matcher.regex)});
    var servicePath;
    return matcher && (servicePath = matcher.replaceFun(serviceName)) && matcher.requireFn(servicePath) || undefined;
}

exports.bindFactory = function (serviceName, factory) {
    exports.factories[serviceName] = factory;
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
    if (!exports.multipleBindings[serviceName]) {
        exports.multipleBindings[serviceName] = [];
    }
    exports.multipleBindings[serviceName].push.apply(exports.multipleBindings[serviceName], serviceNames);
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
    exports.multipleBindings = {};
    exports.scoped = [];
    exports.nameMatchers = [];

    exports.addNameMatcher(/.*/, function (serviceName) {
        if (fs.existsSync(path.join(__dirname, camelHumpsToWireName(serviceName) + '.js'))) {
            return './' + camelHumpsToWireName(serviceName) + '.js';
        }
    }, require);

    exports.addNameMatcher(/^[A-Z]\w*$/, function (serviceName) {
        return './js/' + serviceName + '.js';
    }, require);
};

exports.resetInjection();