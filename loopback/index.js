exports.installModule = function (injection) {
    injection.bindFactory('loopbackModelCompileService', require('./loopback-model-compile-service'));
    injection.bindMultiple('entityDescriptionCompilers', [
        'loopbackModelCompileService'
    ]);
    injection.bindFactory('storageDriver', require('./loopback-storage-driver'));
    injection.bindFactory('passwordFieldName', function () { return 'password' }); //TODO make more clear
    injection.overrideFactory('securityService', 'oldSecurityService', require('./loopback-security-service'))
};