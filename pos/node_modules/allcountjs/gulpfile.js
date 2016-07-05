var gulp = require('gulp');
var injection = require('./services/injection');
require('./allcount-server.js');
var _ = require('underscore');
var path = require('path');
var Q = require('q');

function buildScripts() {
    var assetsService = injection.inject('assetsService');
    var assetsMinifier = injection.inject('assetsMinifier');
    return Q.all(_.map(assetsService.scripts, function (scriptPaths, url) {
        var buildPath = assetsMinifier.buildPath();
        var absoluteScriptPaths = scriptPaths.map(function (p) {
            return path.join(assetsMinifier.defaultPublicPath(), p)
        });
        return assetsMinifier.scriptHash(url, absoluteScriptPaths).then(function (hash) {
            var buildScriptPath = path.join(buildPath, assetsMinifier.hashPath(url, hash));
            return assetsMinifier.minify(absoluteScriptPaths, buildScriptPath);
        })
    }));
}

module.exports = function (gulp) {
    gulp.task('build-allcountjs', function() {
        return buildScripts();
    });
};

module.exports(gulp);
