var domain = require('domain');

module.exports = function (app) {
    return {
        setup: function () {
            app.use(function(req, res, next) {
                var requestDomain = domain.create();
                requestDomain.add(req);
                requestDomain.add(res);
                requestDomain.on('error', next);
                requestDomain.run(next);
            });
        }
    };
};