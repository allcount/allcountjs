module.exports = function (app) {
    return {
        setup: function () {
            app.use(require('body-parser')());
        }
    }
};