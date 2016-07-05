module.exports = function (injection) {
    return {
        compile: function (objects) {
            var self = this;
            objects.forEach(function (obj) {
                var baseUrl = obj.propertyValue('baseUrl');
                if (baseUrl) {
                    self.baseUrl = baseUrl;
                }
            });
        },
        getBaseUrl: function () {
            return this.baseUrl || injection.inject('defaultBaseUrl', true);
        }
    }
};