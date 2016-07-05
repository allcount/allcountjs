var cons = require('consolidate');
var jade = require('jade');

module.exports = function (app) {
    return {
        setup: function () {
            app.engine('html', cons.just);
            app.engine('jade', jade.renderFile);
            app.set('view engine', 'jade');
        }
    };
};