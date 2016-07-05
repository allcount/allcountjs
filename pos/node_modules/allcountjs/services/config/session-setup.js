var path = require('path');

module.exports = function (app, sessionMiddleware) {
    return {
        setup: function () {
            app.use(sessionMiddleware);
        }
    };
};