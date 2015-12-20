var _ = require('lodash');

module.exports = function (injection) {
    console.log('FPS init');

    var service = {};

    service.config = {};

    service.compile = function (objects) {
        console.log('compilation');
        objects.forEach(function (obj) {
            var config = obj.propertyValue('forgotPassword');
            if (config) {
                service.config = config;
            }
        });
    };

    injection.overrideFactory('templateVarService', 'templateVarServiceBase', function (templateVarServiceBase) {
        console.log('init');
        var service = templateVarServiceBase;
        var parentVars = service.vars;
        service.vars = function (req, obj) {
            console.log('vars');
            var vars = _.extend(parentVars(req, obj), {
                forgotPasswordConfig: service.config
            });
            console.log(JSON.stringify(parentVars))
            console.log(JSON.stringify(vars))
            return vars;
        };
      /*  service.setupLocals = function (req, res, obj) {
            console.log('setupLocals');
            res.locals = _.extend(res.locals, service.vars(req, obj));
        }; //todo: get rid of it (copy-pasted)*/
        return service;
    });

    return service;
};