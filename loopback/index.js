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
    injection.overrideFactory('securityService', 'oldSecurityService', require('./loopback-security-service'))
};