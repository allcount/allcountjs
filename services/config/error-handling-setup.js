var domain = require('domain');
var _ = require('lodash');

module.exports = function (app, templateVarService, appUtil) {
    return {
        setup: function () {
            app.use(function (err, req, res, next) {
                templateVarService.setupLocals(req, res);
                if (err instanceof appUtil.ValidationError) {
                    res.status(403).json(err.fieldNameToMessage);
                } else if (err instanceof appUtil.ConflictError) {
                    res.status(409).send(err.message);
                } else if (err) {
                    console.error(err.stack);
                    res.locals.error = err;
                    if (req.url.indexOf('/api/') === 0) {
                        if (_.isError(err)) {
                            res.status(500).send(err.stack.toString());
                        } else {
                            res.status(500).send(err);
                        }
                    } else {
                        res.status(500).render('error');
                    }
                }
            })
        }
    };
};