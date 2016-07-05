module.exports = function (app) {
    return {
        setup: function () {
            app.use(function (req, res, next) {
                if (req.query.lang) {
                    req.session.lang = req.query.lang;
                }
                req.languageSetting = req.session.lang;
                next();
            })
        }
    };
};