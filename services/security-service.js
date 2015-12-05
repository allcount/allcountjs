var _ = require('underscore');
var Q = require('q');

module.exports = function (storageDriver, securityConfigService, entityDescriptionService, appUtil, injection, keygrip, passwordFieldName) {
    var service = {};

    var UserEntityTypeId = "User";

    service.__defineGetter__('onlyAuthenticated', function(){
        return securityConfigService.onlyAuthenticated;
    });

    function userTableDescription() {
        return entityDescriptionService.tableDescription(entityDescriptionService.entityTypeIdCrudId(UserEntityTypeId));
    }

    function findUser(username) {
        return storageDriver.findAll(userTableDescription(), {query: {username: username}}).then(function (user) {
            user = user[0];
            return user;
        })
    }

    service.authenticate = function(username, password, done) {
        var table = userTableDescription();
        return findUser(username).then(function (user) {
            if (!user) {
                return false;
            }
            return storageDriver.checkUserPassword(table, user.id, passwordFieldName, password);
        }).then(prepareUserForReq).nodeify(done);
    };

    service.authenticateAndGenerateToken = function (username, password) {
        return service.authenticate(username, password).then(function (user) {
            if (!user) {
                return false;
            } else {
                return service.generateToken(user);
            }
        })
    };

    service.generateToken = function (user) {
        return user.id + ':' + keygrip.sign(user.id);
    };

    service.loginWithToken = function (req, token) {
        var split = token.split(':');
        var userId = split[0], signed = split[1];
        if (keygrip.verify(userId, signed)) {
            return service.loginUserWithIdIfExists(req, userId);
        } else {
            return Q(null);
        }
    };

    service.loginUserWithIdIfExists = function (req, userId) {
        return storageDriver.readEntity(userTableDescription(), userId).then(function (user) {
            if (user) {
                var login = Q.nfbind(req.login.bind(req));
                prepareUserForReq(user);
                return login(user).thenResolve(user);
            }
            return undefined;
        });
    };

    service.seedDbWithData = function () {
        return service.initDefaultUsers();
    };

    service.initDefaultUsers = function () {
        return storageDriver.addOnConnectListener(function () {
            return findUser("admin").then(function (user) {
                if (!user) {
                    var adminUser = {
                        username: "admin",
                        email: "admin@admin.com", //TODO
                        role_admin: true
                    };
                    adminUser[passwordFieldName] = 'admin';
                    return storageDriver.createEntity(userTableDescription(), adminUser);
                }
            })
        });
    };

    service.getSystemUser = function () {
        return prepareUserForReq({
            username: 'system',
            role_admin: true
        });
    };

    service.asSystemUser = function (fn) {
        return injection.inScope({
            'User': service.getSystemUser()
        }, function () {
            return fn();
        });
    };

    service.createUser = function (username, password, roles) {
        if (!username || !password) {
            throw new Error('Username and password required to create user');
        }
        var user = {
            username: username
        };
        user[passwordFieldName] = password;
        _.forEach(roles, function (role) {
            user['role_' + role] = true;
        });
        return storageDriver.createEntity(userTableDescription(), user).then(readAndPrepareUser).catch(function (err) {
            if (err.message.indexOf("duplicate key error index") !== -1) {
                throw new appUtil.ValidationError({username: 'User with provided user name already exists'});
            }
            throw err;
        });
    };

    service.createGuestUser = function () {
        var id = storageDriver.newEntityId();
        return storageDriver.createEntity(userTableDescription(), {
            id: id,
            username: "Guest-" + id,
            isGuest: true
        }).then(readAndPrepareUser);
    };

    service.serializeUser = function(user, done) {
        done(null, user.id);
    };

    service.userHasAnyRole = function (user, roles) {
        return !roles || user && _.any(roles, function (role) {
            return user.hasRole(role);
        })
    };

    function prepareUserForReq(user) {
        if (user) {
            user.hasRole = function (role) {
                return this['role_' + role] === true || this.role_admin === true;
            };
        }
        return user;
    }

    service.prepareUserForReq = prepareUserForReq;

    function readAndPrepareUser(userId) {
        return storageDriver.readEntity(userTableDescription(), userId).then(function (user) {
            return prepareUserForReq(user);
        });
    }

    service.readAndPrepareUser = readAndPrepareUser;

    service.deserializeUser = function(userId, done) {
        readAndPrepareUser(userId).nodeify(done);
    };

    service.withUserScope = function (user, fn) {
        return injection.inScope({User: user || null}, fn);
    };

    service.withUserScopeByName = function (username, fn) {
        return findUser(username).then(function (user) {
            return prepareUserForReq(user);
        }).then(function (user) {
            return service.withUserScope(user, fn);
        })
    };

    return service;
};