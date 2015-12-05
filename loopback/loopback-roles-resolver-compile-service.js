module.exports = function (securityService, loopback) {
    return {
        compile: function (objects) {
            var self = this;
            self.registerResolverForRole('admin'); //TODO get form system roles
            objects.forEach(function (obj) {
                obj.invokePropertiesOn({
                    roles: function (roles) {
                        roles.forEach(self.registerResolverForRole.bind(self));
                    }
                })
            })
        },
        registerResolverForRole: function (role) {
            var Role = loopback.getModel('Role');
            Role.registerResolver(role, function(role, context, cb) {
                function reject(err) {
                    if(err) {
                        return cb(err);
                    }
                    cb(null, false);
                }
                var userId = context.accessToken.userId;
                console.log("check role: " + role + " for user id: " + userId);
                if (!userId) {
                    return reject();
                }
                securityService.readAndPrepareUser(userId).then(function (user) {
                    return user.hasRole(role);
                }).then(function (inRole) {
                    console.log("inRole: " + inRole);
                    return inRole;
                }).nodeify(cb);
            });
        }
    }
};