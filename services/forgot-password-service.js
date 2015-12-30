var _ = require('lodash');

module.exports = function (injection) {
    var service = {};

    service.config = {};

    service.compile = function (objects) {
        objects.forEach(function (obj) {
            var config = obj.propertyValue('forgotPassword');
            if (config) {
                service.config = config;
            }
        });
    };

    injection.overrideFactory('templateVarService', 'templateVarServiceBase', function (templateVarServiceBase) {
        var parentVarsMethod = templateVarServiceBase.vars;
        templateVarServiceBase.vars = function (req, obj) {
            var parentVars = parentVarsMethod(req, obj);
            var vars = _.extend(parentVars, {
                forgotPasswordConfigIsDefined: !_.isEmpty(service.config)
            });
            return vars;
        };
        return templateVarServiceBase;
    });

    return service;
};