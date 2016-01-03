module.exports = function (injection, appUtil) {
    return {
        configObjects: function (errorsReport) {
            var objects = [];
            injection.inScope({
                A: function () {
                    return {
                        app: function (obj) {
                            objects.push(appUtil.evaluateObject(obj));
                        }
                    }
                }
            }, function () {
                injection.inject('appConfigs');
            });
            return objects;
        }
    }
};