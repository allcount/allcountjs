var crypto = require('crypto');
var _ = require('underscore');
var Q = require('q');

module.exports = function (storageDriver) {
    var service = {};

    var systemRoles;

    service.compile = function (objects, errors) {
        systemRoles = ['admin'];
        objects.forEach(function (obj) {
            var onlyAuthenticated = obj.propertyValue('onlyAuthenticated');
            if (onlyAuthenticated) {
                service.onlyAuthenticated = onlyAuthenticated;
            }
            var roles = obj.propertyValue('roles');
            roles && systemRoles.push.apply(systemRoles, roles);
        });
    };

    service.roles = function () {
        return systemRoles;
    };

    service.authenticate = function(username, password, done) {
        return storageDriver.findUser(username).then(function (user) {
            if (!user) {
                done(null, false);
                return;
            }
            var userId = user._id.toString();
            var digest = storageDriver.passwordHash(userId, password);
            done(null, digest === user.passwordHash ? user : false);
        });
    };

    service.loginUserWithIdIfExists = function (req, userId) {
        return storageDriver.findUserById(userId).then(function (user) {
            if (user) {
                var login = Q.nfbind(req.login.bind(req));
                prepareUserForReq(user);
                return login(user);
            }
            return undefined;
        });
    };

    service.initDefaultUsers = function () {
        storageDriver.addOnConnectListener(function () {
            storageDriver.findUser("admin").then(function (user) {
                if (!user) {
                    return service.createUser("admin", "admin", ['admin']);
                }
            })
        });
    };

    service.createUser = function (username, password, roles) {
        return storageDriver.createUser(username, function (userId) {
            return storageDriver.passwordHash(userId, password);
        }, roles).then(prepareUserForReq);
    };

    service.createGuestUser = function () {
        return storageDriver.createUser('Guest', undefined, [], true).then(prepareUserForReq);
    };

    service.serializeUser = function(user, done) {
        done(null, user._id.toString());
    };

    function prepareUserForReq(user) {
        user.passwordHash = undefined;
        user.hasRole = function (role) {
            return _.contains(this.roles, role) || _.contains(this.roles, 'admin');
        };
        user.id = user._id.toString();
        return user;
    }

    service.deserializeUser = function(userId, done) {
        storageDriver.findUserById(userId).then(function (user) {
            prepareUserForReq(user);
            done(null, user);
        });
    };

    return service;
};