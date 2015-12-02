var injection = require('../services/injection.js');
var Q = require('q');

function configure() {
    injection.bindFactory('entityCrudStrategy', require('../services/crud/entity-crud-strategy'));
    injection.bindMultiple('compileServices', [
        'messagesService',
        'securityConfigService',
        'entityDescriptionService',
        'actionService',
        'crudHookService',
        'referentialIntegrity',
        'defaultReferenceResolverHook',
        'computedFieldService',
        'layoutService',
        'viewService',
        'menuService',
        'trackingService',
        'themeService',
        'cloudinaryService',
        'homePageService',
        "webhookService",
        'baseUrlService',
        'securityService'
    ]);
    injection.bindMultiple('crudStrategies', ['entityCrudStrategy']);
    injection.bindFactory('fieldsApi', require('../services/js/Fields'));
    injection.bindFactory('allcountServerStartup', require('../allcount-server-startup'));
    injection.bindFactory('halt', function (gitRepoUrl) {
        return function (cause) {
            console.log(util.format('Exiting app "%s"%s...'), gitRepoUrl, cause ? " (" + cause + ")" : "");
            process.exit();
        };
    });

    injection.bindFactory('referenceResolvers', ['defaultReferenceResolver']);
    injection.bindFactory('Console', function () {
        return console;
    });
    injection.bindFactory('Q', function () {
        return Q;
    });
    injection.bindFactory('ValidationError', require('../services/validation-error'));
    injection.bindFactory('passwordFieldName', function () { return 'passwordHash' }); //TODO make more clear
}

configure();

injection.initializeScopedThen(Q);

module.exports = injection;

module.exports.reconfigureCore = configure;