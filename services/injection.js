var fs = require('fs');
var path = require('path');
module.exports = require('./injection-base');
var _ = require('underscore');

var superResetInjection = module.exports.resetInjection;

module.exports.resetInjection = function () {
    superResetInjection.call(this);

    module.exports.addNameMatcher(/.*/, function (serviceName) {
        if (fs.existsSync(path.join(__dirname, module.exports.camelHumpsToWireName(serviceName) + '.js'))) {
            return './' + module.exports.camelHumpsToWireName(serviceName) + '.js';
        }
    }, require);

    module.exports.addNameMatcher(/^[A-Z]\w*$/, function (serviceName) {
        if (fs.existsSync(path.join(__dirname, 'js', serviceName + '.js'))) {
            return './js/' + serviceName + '.js';
        }
    }, require);
};

module.exports.installModulesFromPackageJson = function (packageJsonFilePath) {
    var packageJson = JSON.parse(fs.readFileSync(packageJsonFilePath));
    var allcountjsModules = packageJson.allcountjsModules;
    if (allcountjsModules && _.isArray(allcountjsModules)) {
        allcountjsModules.forEach(function (moduleName) {
            module.exports.installModule(require(moduleName));
        });
    } else {
        packageJson.dependencies = packageJson.dependencies || {};
        _.forEach(packageJson.dependencies, function (version, name) {
            if (name.indexOf("allcountjs-") === 0) {
                module.exports.installModule(require(name));
            }
        })
    }
};

module.exports.resetInjection();