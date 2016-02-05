var path = require('path');
var fs = require('fs');
var url = require('url');
var mkdirp = require('mkdirp');
var _ = require('underscore');
var webpack = require('webpack');

module.exports = function (app, expressStatic, lessMiddleware, repositoryService, themeService, assetsService, Q, assetsMinifier) {
    return {
        defaultPublicPath: function () {
            return assetsMinifier.defaultPublicPath();
        },
        publicPaths: [],
        setup: function () {
            var repositoryPublic = path.join(repositoryService.repositoryDir(), 'public');
            if (fs.existsSync(repositoryPublic)) {
                this.setupPublicPathServing(repositoryPublic, path.join(repositoryService.repositoryDir(), 'tmp/css'));
            }
            this.setupPublicPathServing(this.defaultPublicPath(), path.join(process.cwd(), 'tmp/css'));
            return this.setupMinifyMiddleware();
        },
        setupMinifyMiddleware: function () {
            var buildPath = assetsMinifier.buildPath();
            var compiler = webpack(assetsService.webpackConfig(app.get('env') === "production"));
            console.log("Compiling assets...");
            app.use(expressStatic(buildPath));
            if (app.get('env') === "production") {
                return Q.nfbind(compiler.run.bind(compiler))().then(function () {
                    console.log("Asset compilation is finished");
                });
            } else {
                this.webpackWatch = compiler.watch({poll: false}, function () {
                    console.log("Asset compilation is finished");
                });
            }
        },
        tearDown: function () {
            return this.webpackWatch && this.webpackWatch.close();
        },
        setupPublicPathServing: function (publicPath, cssOutputPath) {
            this.publicPaths.push(publicPath);
            var fullThemePath;
            if (
                themeService.themeLessPath() &&
                (fullThemePath = path.join(publicPath, themeService.themeLessPath())) &&
                fs.existsSync(fullThemePath)
            ) {
                themeService.themeFileDefined = true;
                var mainLessPath = path.join(this.defaultPublicPath(), 'assets', 'less', 'main.less');
                var targetMainLessPath = path.join(publicPath, themeService.mainLessPath());
                var targetMainLessDir = path.dirname(targetMainLessPath);
                mkdirp.sync(targetMainLessDir, 511 /* 0777 */);
                fs.writeFileSync(targetMainLessPath, '@import "' + path.relative(targetMainLessDir, mainLessPath) + '";\n@import "' + path.relative(targetMainLessDir, fullThemePath) + '";');
            }
            app.use(lessMiddleware(publicPath, {dest: cssOutputPath}));
            app.use(expressStatic(publicPath));
            app.use(expressStatic(cssOutputPath));
        }
    };
};