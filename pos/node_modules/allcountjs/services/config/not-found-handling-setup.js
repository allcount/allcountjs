var domain = require('domain');
var _ = require('lodash');

module.exports = function (app, templateVarService, appUtil) {
    return {
        setup: function () {
            app.use(function (req, res) {
                templateVarService.setupLocals(req, res);
                res.status(404).render('not-found');
            });
        }
    };
};