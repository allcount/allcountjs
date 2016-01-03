var Q = require('q');
var Keygrip = require('keygrip');

exports.installModule = function (injection) {
    injection.bindFactory('entityCrudStrategy', require('../services/crud/entity-crud-strategy'));
    injection.bindMultiple('compileServices', [
        'forgotPasswordService',
        //'messagesService',
        'securityConfigService',
        'entityDescriptionService',
        'actionService',
        //'crudHookService',
        //'referentialIntegrity',
        //'defaultReferenceResolverHook',
        //'computedFieldService',
        'layoutService',
        //'viewService',
        'menuService',
        //'trackingService',
        //'themeService',
        //'cloudinaryService',
        //'homePageService',
        //"webhookService",
        //'baseUrlService',
        //'migrationService',
        //'dbSeedService'
    ]);
    injection.bindFactory('forgotPasswordService', require('../services/forgot-password-service'));
    //injection.bindFactory('messagesService', require('../services/messages-service'));
    injection.bindFactory('securityConfigService', require('../services/security-config-service'));
    injection.bindFactory('entityDescriptionService', require('../services/entity-description-service'));
    injection.bindFactory('actionService', require('../services/action-service'));
    injection.bindFactory('crudHookService', require('../services/crud-hook-service'));
    injection.bindFactory('referentialIntegrity', require('../services/referential-integrity'));
    injection.bindFactory('defaultReferenceResolverHook', require('../services/default-reference-resolver-hook'));
    injection.bindFactory('computedFieldService', require('../services/computed-field-service'));
    injection.bindFactory('layoutService', require('../services/layout-service'));
    injection.bindFactory('viewService', function () { return {} }); //TODO
    injection.bindFactory('storageDriver', function () { return {} }); //TODO
    injection.bindFactory('menuService', require('../services/menu-service'));
    //injection.bindFactory('trackingService', require('../services/tracking-service'));
    //injection.bindFactory('cloudinaryService', require('../services/cloudinary-service'));
    //injection.bindFactory('homePageService', require('../services/home-page-service'));
    injection.bindFactory('dbSeedService', require('../services/db-seed-service'));
    injection.bindFactory('appService', require('../services/app-service'));
    injection.bindFactory('appUtil', require('../services/app-util'));
    injection.bindFactory('linkBuilder', require('../services/link-builder'));
    injection.bindFactory('securityService', require('../services/security-service'));
    injection.bindFactory('Queries', require('../services/js/Queries'));
    injection.bindFactory('Fields', require('../services/js/Fields'));
    injection.bindMultiple('entityDescriptionCompilers', []);
    injection.bindFactory('queryParseService', function () { return {} }); //TODO
    injection.bindMultiple('dbSeedProviders', ['securityService']);
    injection.bindMultiple('crudStrategies', ['entityCrudStrategy']);
    //injection.bindFactory('allcountServerStartup', require('../allcount-server-startup'));

    injection.bindFactory('referenceResolvers', ['defaultReferenceResolver']);
    injection.bindFactory('Console', function () {
        return console;
    });
    injection.bindFactory('Q', function () {
        return Q;
    });
    injection.bindFactory('ValidationError', require('../services/validation-error'));
    injection.bindFactory('passwordFieldName', function () { return 'passwordHash' }); //TODO make more clear
    injection.bindFactory('defaultAppConfig', require('../core/default-app-config'));
    injection.bindMultiple('appConfigs', ['defaultAppConfig']);
    injection.bindMultiple('configObjectProviders', ['appConfigsObjectProvider']);
    injection.bindFactory('appConfigsObjectProvider', require('../services/app-configs-object-provider'));

    injection.bindFactory('keygrip', function () {
        return Keygrip(['1234567890']);
    });
};