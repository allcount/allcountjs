module.exports = function () {
    var service = {};

    service.themeFileDefined = false;

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

    service.mainLess = function () {
        return service.theme ? (service.theme + '-main.less') : 'main.less'
    };

    service.mainLessPath = function () {
        return (!this.themeFileDefined ? this.lessPath() : '/') + this.mainLess();
    };

    service.lessPath = function () {
        return '/assets/less/';
    };

    service.mainCssPath = function () {
        return (!this.themeFileDefined ? this.lessPath() : '/') + this.mainCss();
    };

    service.themeLessPath = function () {
        return service.theme ? this.lessPath() + (service.theme + '-theme.less') : undefined;
    };

    return service;
};