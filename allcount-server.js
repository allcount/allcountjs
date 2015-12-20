var injection = require('./core');
var path = require('path');
var Keygrip = require('keygrip');
var crypto = require('crypto');
var http = require('http');
var util = require('util');

function configure() {
    injection.addNameMatcher(/(.*?)Route/, function (serviceName) {
        return './routes/' + injection.camelHumpsToWireName(serviceName) + '.js';
    }, require);

    injection.addNameMatcher(/(.*?)Setup/, function (serviceName) {
        return './services/config/' + injection.camelHumpsToWireName(serviceName) + '.js';
    }, require);
    injection.bindMultiple('entityDescriptionCompilers', [
        'mongooseModelCompileService',
        'mongoBsonSerializationCompileService',
        'referenceNameService'
    ]);
    injection.bindMultiple('appConfigs',['forgotPasswordModule']);
    injection.bindFactory('mongoBsonSerializationCompileService', require('./services/mongo/mongo-bson-serialization-compile-service'));
    injection.bindFactory('mongoFieldService', require('./services/mongo/mongo-field-service'));
    injection.bindFactory('mongoDefaultFieldProvider', require('./services/mongo/mongo-default-field-provider'));
    injection.bindMultiple('mongoFieldProviders', ['mongoDefaultFieldProvider']);
    injection.bindFactory('menuRoute', require('./routes/menu-route'));
    injection.bindFactory('indexRoute', require('./routes'));
    injection.bindFactory('entityRoute', require('./routes/entity'));
    injection.bindFactory('fieldDescriptionsRoute', require('./routes/field-descriptions'));
    injection.bindFactory('crudRoute', require('./routes/crud'));
    injection.bindFactory('securityRoute', require('./routes/security'));
    injection.bindFactory('customViewsRoute', require('./routes/custom-views'));
    injection.bindFactory('messages', require('./routes/messages'));
    injection.bindMultiple('viewPaths', ['defaultViewPathProvider']);
    injection.bindFactory('defaultViewPathProvider', function () {
        return [path.join(__dirname, 'views')];
    });
    injection.bindFactory('express', function () {
        return require('express')
    });
    injection.bindFactory('app', function (express) {
        return express()
    });
    injection.bindFactory('passport', function () {
        return require('passport')
    });

    injection.bindFactory('keygrip', function () {
        return Keygrip([crypto.randomBytes(30).toString('hex')]); //TODO load rotating keys from somewhere
    });
    injection.bindFactory('sessionMiddleware', function (keygrip) {
        return require('cookie-session')({keys: keygrip})
    });
    injection.bindFactory('httpServer', function (port) {
        return function (handler, onReady) {
            var server = http.createServer(handler);
            server.listen(port, onReady);
            return server;
        }
    });
    injection.bindFactory('proxyHandler', function () {
        return function (req, res, next) {
            next()
        }
    });
    injection.bindMultiple('appConfigurators', ['webhooksRoute', 'integrationsRoute']);
    injection.bindMultiple('loginMethods', []);
    injection.bindMultiple('appSetup', [
        'variablesSetup',
        'viewEngineSetup',
        'domainErrorHandlerSetup',
        'requestParserSetup',
        'assetsSetup',
        'sessionSetup',
        'languageSettingSetup',
        'securitySetup',
        'viewPathsSetup',
        'routesSetup',
        'errorHandlingSetup',
        'notFoundHandlingSetup'
    ]);
    injection.bindFactory('defaultAssets', require('./services/config/default-assets'));
    injection.bindFactory('assetsMinifier', require('./services/config/assets-minifier'));
    injection.bindMultiple('scriptConfigs', ['defaultAssets']);
    injection.bindFactory('renderEngine', function () {
        return require('jade').renderFile;
    });

    injection.bindFactory('expressStatic', function (express) {
        return express.static;
    });

    injection.bindFactory('lessMiddleware', function () {
        return require('less-middleware');
    });
    injection.bindFactory('routeUtil', require('./routes/route-util'));
    injection.bindMultiple('integrationProviders', []);
}

configure();

module.exports = injection;
module.exports.reconfigureAllcount = function () {
    module.exports.reconfigureCore();
    configure();
};