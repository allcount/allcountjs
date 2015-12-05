module.exports = function () {
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

    return service;
};