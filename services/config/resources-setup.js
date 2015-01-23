var path = require('path');

module.exports = function (app, securityService, expressStatic, lessMiddleware) {
    return {
        setup: function () {
            var cssOutputPath = path.join(process.cwd(), 'tmp/css');
            var publicPath = path.join(__dirname, '..', '..', 'public');
            app.use(lessMiddleware({src: publicPath, dest: cssOutputPath}));
            app.use(expressStatic(publicPath));
            app.use(expressStatic(cssOutputPath));
        }
    };
};