var LocalStrategy = require('passport-local').Strategy;

module.exports = function (app, securityService, passport) {
    return {
        setup: function () {
            passport.use(new LocalStrategy(securityService.authenticate));
            passport.serializeUser(securityService.serializeUser);
            passport.deserializeUser(securityService.deserializeUser);
            app.use(passport.initialize());
            app.use(passport.session());
        }
    };
};