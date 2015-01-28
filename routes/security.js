var Q = require('q');

module.exports = function (templateVarService, keygrip, securityService, securityConfigService, loginMethods) {
    var routes = {};

    routes.login = function (req, res) {
        if (req.user && (!req.user.isGuest || req.query.redirect_url)) {
            successLoginRedirect(req.user, req, res);
        } else if (req.query.user_id && keygrip.verify(req.query.user_id, req.query.sign)) {
            securityService.loginUserWithIdIfExists(req, req.query.user_id).then(function () {
                res.redirect('/');
            }, function () {
                res.redirect('/login');
            }).done();
        } else {
            templateVarService.setupLocals(req, res, {
                redirect_url: req.query.redirect_url,
                loginMethods: loginMethods.map(function (method) {
                    return {
                        label: method.label,
                        url: method('https://' + req.header('Host') + '/login' ,req, res)
                    }
                })
            });
            res.render('login');
        }
    };

    function successLoginRedirect(user, req, res) {
        if (req.query.redirect_url) {
            var userId = user.id.toString();
            res.redirect(req.query.redirect_url + "?" + [
                ['user_id', userId],
                ['sign', keygrip.sign(userId)]
            ].map(function (s) {
                return s.join('=')
            }).join('&'));
        } else {
            res.redirect('/');
        }
    }

    routes.performLogin = function (passportAuthenticate) {
        return function (req, res) {
            passportAuthenticate(req, res).then(function (user) {
                if (user) {
                    return Q.nfbind(req.logIn.bind(req))(user).then(function () {
                        successLoginRedirect(user, req, res);
                    });
                } else {
                    res.redirect('/login?redirect_url='+req.query.redirect_url);
                }
            }, function (err) {
                res.redirect('/login?redirect_url='+req.query.redirect_url);
            }).done();
        };
    };

    routes.logout = function (req, res) {
        req.logout();
        res.redirect('/');
    };

    routes.signUp = function (req, res, next) {
        if (!securityConfigService.allowSignUp) {
            res.sendStatus(403);
        } else {
            securityService.createUser(req.body.username, req.body.password, []).then(function () { //TODO use guest user if we have one
                res.sendStatus(200);
            }).catch(next);
        }
    };

    return routes;
};