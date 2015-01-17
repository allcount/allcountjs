var domain = require('domain');

module.exports = function (app, templateVarService, appUtil) {
    return {
        setup: function () {
            app.use(function (req, res) {
                templateVarService.setupLocals(req, res);
                res.status(404).render('not-found');
            });
            app.use(function (err, req, res, next) {
                templateVarService.setupLocals(req, res);
                if (err instanceof appUtil.ValidationError) {
                    res.status(403).json(err.fieldNameToMessage);
                } else if (err) {
                    console.error(err.stack);
                    res.locals.error = err;
                    res.status(500).render('error');
                }
            })
        }
    };
};