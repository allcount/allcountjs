module.exports = function (injection, securityService) {
    return {
        asSystem: function (fn) {
            return securityService.asSystemUser(fn);
        }
    }
};