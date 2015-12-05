module.exports = function (oldSecurityService, loopback, Q, loopbackApp) {
    oldSecurityService.authenticate = function(username, password, done) {
        return Q(loopback.getModel('User').login({username: username, password: password})).then(function (authentication) {
            return authentication.userId;
        }).then(oldSecurityService.readAndPrepareUser).nodeify(done);
    };
    return oldSecurityService;
};