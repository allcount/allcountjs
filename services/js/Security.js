module.exports = function (injection, securityService) {
    return {
        asSystem: function (fn) {
            return injection.inScope({
                'User': securityService.getSystemUser()
            }, function () {
                return fn();
            });
        }
    }
};