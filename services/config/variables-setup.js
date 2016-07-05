module.exports = function (app, port) {
    return {
        setup: function () {
            app.set('port', port);
        }
    };
};