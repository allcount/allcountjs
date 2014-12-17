module.exports = function () {
    var service = {};

    service.compile = function (objects, errors) {
        objects.forEach(function (obj) {
            var theme = obj.propertyValue('theme');
            if (theme) {
                service.theme = theme;
            }
        });
    };

    service.mainCss = function () {
        return service.theme ? (service.theme + '-main.css') : 'main.css';
    };

    return service;
};