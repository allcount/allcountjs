var path = require('path');
var fs = require('fs');
url = require('url');
var Q = require('Q');
var mkdirp = require('mkdirp');

module.exports = function (app, securityService, expressStatic, lessMiddleware, repositoryService, themeService) {
    return {
        defaultPublicPath: function () {
            return path.join(__dirname, '..', '..', 'public');
        },
        setup: function () {
            var repositoryPublic = path.join(repositoryService.repositoryDir(), 'public');
            if (fs.existsSync(repositoryPublic)) {
                this.setupPublicPathServing(repositoryPublic, path.join(repositoryService.repositoryDir(), 'tmp/css'));
            }
            this.setupPublicPathServing(this.defaultPublicPath(), path.join(process.cwd(), 'tmp/css'));
        },
        setupPublicPathServing: function (publicPath, cssOutputPath) {
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