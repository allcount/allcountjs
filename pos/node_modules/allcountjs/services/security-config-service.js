module.exports = function () {
    var systemRoles;
    return {
        compile: function (objects) {
            var service = this;
            systemRoles = ['admin'];
            objects.forEach(function (obj) {
                var onlyAuthenticated = obj.propertyValue('onlyAuthenticated');
                if (onlyAuthenticated) {
                    service.onlyAuthenticated = onlyAuthenticated;
                }
                var allowSignUp = obj.propertyValue('allowSignUp');
                if (allowSignUp) {
                    service.allowSignUp = allowSignUp;
                }
                var roles = obj.propertyValue('roles');
                roles && systemRoles.push.apply(systemRoles, roles);
            });
        },
        roles: function () {
            return systemRoles;
        }
    };
};