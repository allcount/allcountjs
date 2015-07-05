var injection = require('./services/injection.js');
var path = require('path');
var Keygrip = require('keygrip');
var crypto = require('crypto');
var http = require('http');
var util = require('util');
var Q = require('q');

function configure() {
    injection.addNameMatcher(/(.*?)Route/, function (serviceName) {
        return './routes/' + injection.camelHumpsToWireName(serviceName) + '.js';
    }, require);

    injection.addNameMatcher(/(.*?)Setup/, function (serviceName) {
        return './services/config/' + injection.camelHumpsToWireName(serviceName) + '.js';
    }, require);

    injection.bindFactory('entityCrudStrategy', require('./services/crud/entity-crud-strategy'));
    injection.bindMultiple('compileServices', [
        'messagesService',
        'securityConfigService',
        'entityDescriptionService',
        'crudService',
        'actionService',
        'crudHookService',
        'computedFieldService',
        'layoutService',
        'viewService',
        'menuService',
        'trackingService',
        'themeService',
        'migrationService',
        'cloudinaryService'
    ]);
    injection.bindMultiple('crudStrategies', ['entityCrudStrategy']);
    injection.bindFactory('menuRoute', require('./routes/menu-route'));
    injection.bindFactory('indexRoute', require('./routes'));
    injection.bindFactory('entityRoute', require('./routes/entity'));
    injection.bindFactory('fieldDescriptionsRoute', require('./routes/field-descriptions'));
    injection.bindFactory('crudRoute', require('./routes/crud'));
    injection.bindFactory('securityRoute', require('./routes/security'));
    injection.bindFactory('customViewsRoute', require('./routes/custom-views'));
    injection.bindFactory('messages', require('./routes/messages'));
    injection.bindFactory('fieldsApi', require('./services/js/Fields'));
    injection.bindFactory('allcountServerStartup', require('./allcount-server-startup'));
    injection.bindMultiple('viewPaths', ['defaultViewPathProvider']);
    injection.bindFactory('defaultViewPathProvider', function () {
        return [path.join(__dirname, 'views')];
    });
    injection.bindFactory('express', function () { return require('express') });
    injection.bindFactory('app', function (express) { return express() });
    injection.bindFactory('passport', function () { return require('passport') });

    injection.bindFactory('keygrip', function () {
        return Keygrip([crypto.randomBytes(30).toString('hex')]); //TODO load rotating keys from somewhere
    });
    injection.bindFactory('sessionMiddleware', function (keygrip) { return require('cookie-session')({keys: keygrip}) });
    injection.bindFactory('httpServer', function (port) {
        return function (handler, onReady) {
            var server = http.createServer(handler);
            server.listen(port, onReady);
            return server;
        }
    });
    injection.bindFactory('proxyHandler', function () { return function (req, res, next) { next() } });
    injection.bindMultiple('appConfigurators', []);
    injection.bindFactory('halt', function (gitRepoUrl) {
        return function (cause) {
            console.log(util.format('Exiting app "%s"%s...'), gitRepoUrl, cause ? " (" + cause + ")" : "");
            process.exit();
        };
    });
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
        'errorHandlingSetup'
    ]);
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
}

configure();

injection.initializeScopedThen(Q);

module.exports = injection;
module.exports.reconfigureAllcount = configure;