var gulp = require('gulp');
var injection = require('./services/injection');
require('./allcount-server.js');
var _ = require('underscore');
var path = require('path');
var Q = require('q');
var webpack = require('webpack');

function buildScripts() {
    var assetsService = injection.inject('assetsService');
    var assetsMinifier = injection.inject('assetsMinifier');

    var config = assetsService.baseWebPackConfig(true);
    config.entry = _.object(_.map(assetsService.scripts, function (scripts, url) {
        return [url, scripts];
    }));
    var compiler = webpack(config);
    return Q.nfbind(compiler.run.bind(compiler))().then(function () {
        console.log("Webpack compilation is finished");
    });
}

module.exports = function (gulp) {
    gulp.task('build-allcountjs', function() {
        return buildScripts();
    });
};

module.exports(gulp);
