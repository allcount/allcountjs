exports.installModule = function (injection) {
    injection.bindFactory('loopbackModelCompileService', require('./loopback-model-compile-service'));
    injection.bindMultiple('entityDescriptionCompilers', [
        'loopbackModelCompileService',
        'loopbackCrudHookService'
    ]);
    injection.bindFactory('loopbackRolesResolverCompileService', require('./loopback-roles-resolver-compile-service'));
    injection.bindFactory('loopbackCrudHookService', require('./loopback-crud-hook-service'));
    injection.bindMultiple('compileServices', ['loopbackRolesResolverCompileService']);
    injection.bindFactory('storageDriver', require('./loopback-storage-driver'));
    injection.bindFactory('passwordFieldName', function () { return 'password' }); //TODO make more clear
    injection.overrideFactory('securityService', 'oldSecurityService', require('./loopback-security-service'));

    injection.bindFactory('express', function (loopback) {
        return loopback;
    });
    injection.bindFactory('app', function (loopbackApp) {
        return loopbackApp;
    });
    // Don't init new httpServer
    injection.bindFactory('httpServer', function () {
        return function (handler, callback) {
            callback();
        }
    });
    injection.bindFactory('notFoundHandlingSetup', function () {
        return {
            setup: function () {}
        }
    });
    injection.bindFactory('variablesSetup', function () { //TODO no need to set port
        return {
            setup: function () {}
        }
    });
    injection.bindFactory('loopbackUserAppConfig', require('./loopback-user-app-config'));
    injection.bindMultiple('appConfigs', ['loopbackUserAppConfig']);
};