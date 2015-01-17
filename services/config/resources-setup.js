var path = require('path');

module.exports = function (app, securityService, express) {
    return {
        setup: function () {
            var cssOutputPath = path.join(process.cwd(), 'tmp/css');
            var publicPath = path.join(__dirname, '..', '..', 'public');
            app.use(require('less-middleware')({src: publicPath, dest: cssOutputPath}));
            app.use(express.static(publicPath));
            app.use(express.static(cssOutputPath));
        }
    };
};