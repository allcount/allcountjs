module.exports = function () {
    var service = {};

    service.compile = function (objects, errors) {
        objects.forEach(function (obj) {
            var googleAnalyticsId = obj.stringPropertyValue('googleAnalyticsId');
            if (googleAnalyticsId) {
                service.googleAnalyticsId = googleAnalyticsId;
            }
        });
    };

    service.trackingTemplateVars = function () {
        return {
            googleAnalyticsId: service.googleAnalyticsId
        }
    };

    return service;
};