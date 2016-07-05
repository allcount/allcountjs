module.exports = function (linkBuilder) {
    return {
        compile: function (objects, errors) {
            var self = this;
            objects.forEach(function (obj) {
                if (obj.hasPropertyValue('homePage')) {
                    self.homePageObj = obj;
                }
            });
        },
        homePage: function () {
            if (!this.homePageObj) {
                return '/';
            }
            var homePage = this.homePageObj.evaluatedValue('homePage');
            return homePage && linkBuilder.buildLinkTo(homePage) || '/';
        }
    };
};