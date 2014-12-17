var Q = require('q');

module.exports = function (templateVarService, keygrip, securityService, loginMethods) {
    var routes = {};

    routes.login = function (req, res) {
        if (req.user) {
            successLoginRedirect(req.user, req, res);
        } else if (req.param('user_id') && keygrip.verify(req.param('user_id'), req.param('sign'))) {
            securityService.loginUserWithIdIfExists(req, req.param('user_id')).then(function () {
                res.redirect('/');
            }, function () {
                res.redirect('/login');
            }).done();
        } else {
            templateVarService.setupLocals(req, res, {
                redirect_url: req.param('redirect_url'),
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
        if (req.param('redirect_url')) {
            var userId = user._id.toString();
            res.redirect(req.param('redirect_url') + "?" + [
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
                    res.redirect('/login?redirect_url='+req.param('redirect_url'));
                }
            }, function (err) {
                res.redirect('/login?redirect_url='+req.param('redirect_url'));
            }).done();
        };
    };

    routes.logout = function (req, res) {
        req.logout();
        res.redirect('/');
    };

    return routes;
};