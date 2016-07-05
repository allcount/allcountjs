var path = require('path');
var fs = require('fs');
var url = require('url');
var mkdirp = require('mkdirp');
var _ = require('underscore');

module.exports = function (app, expressStatic, lessMiddleware, repositoryService, themeService, assetsService, Q, assetsMinifier, securityRoute) {
    return {
        defaultPublicPath: function () {
            return assetsMinifier.defaultPublicPath();
        },
        publicPaths: [],
        setup: function () {
            var repositoryPublic = path.join(repositoryService.repositoryDir(), 'public');
            app.use(function (req, res, next) {
                if (req.url.indexOf('/assets') === 0) {
                    securityRoute.setAccessControlHeaders(res);
                }
                next();
            });
            if (fs.existsSync(repositoryPublic)) {
                this.setupPublicPathServing(repositoryPublic, path.join(repositoryService.repositoryDir(), 'tmp/css'));
            }
            this.setupPublicPathServing(this.defaultPublicPath(), path.join(process.cwd(), 'tmp/css'));
            if (app.get('env') === "production") {
                this.setupMinifyMiddleware();
            }
        },
        setupMinifyMiddleware: function () {
            var self = this;
            function fsExists(p) {
                var deferred = Q.defer();
                fs.exists(p, function (e) {
                    deferred.resolve(e);
                });
                return deferred.promise;
            }

            function pathToScript(script) {
                return Q.all(self.publicPaths.map(function (p) {
                    var name = path.join(p, script);
                    return fsExists(name).then(function (exists) {
                        return exists && name;
                    })
                })).then(function (paths) {
                    return _.find(paths, _.identity);
                })
            }

            var buildPath = assetsMinifier.buildPath();
            app.use(function (req, res, next) {
                var scriptPath = url.parse(req.url).pathname;
                var scripts = assetsService.scripts[scriptPath];
                if (!scripts) {
                    next();
                    return;
                }

                return Q.all(scripts.map(pathToScript)).then(function (scriptPaths) {
                    return assetsMinifier.scriptHash(scriptPath, scriptPaths).then(function (hash) {
                        var hashUrl = assetsMinifier.hashPath(scriptPath, hash);
                        var buildScriptPath = path.join(buildPath, hashUrl);
                        return fsExists(buildScriptPath).then(function (buildScriptExists) {
                            if (buildScriptExists) {
                                return;
                            }
                            return assetsMinifier.minify(scriptPaths, buildScriptPath);
                        }).then(function () {
                            req.url = hashUrl;
                            next();
                        });
                    })
                }).catch(next);
            });
            app.use(expressStatic(buildPath));
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