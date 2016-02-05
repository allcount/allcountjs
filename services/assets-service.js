var _ = require('underscore');
var webpack = require('webpack');

module.exports = function (scriptConfigs, assetsMinifier) {
    return {
        scripts: _.chain(scriptConfigs).map(function (scriptConfig) {
            return _.map(scriptConfig, function (paths, url) {
                return [url, paths];
            })
        }).flatten(true).object().value(),
        concatScripts: function (concatScriptPath) {
            return [concatScriptPath];
        },
        baseWebPackConfig: function (production) {
            return {
                target: 'web',
                cache: true,
                output: {
                    path: assetsMinifier.buildPath(),
                    publicPath: '',
                    filename: '[name]',
                    library: ['Libs', '[name]'],
                    pathInfo: true
                },
                resolve: {
                    root: assetsMinifier.defaultPublicPath(),
                    extensions: ['', '.js'],
                    modulesDirectories: ['node_modules', 'bower_components'],
                    alias: {
                        'load-image': 'blueimp-load-image/js/load-image.js',
                        'load-image-exif': 'blueimp-load-image/js/load-image-exif.js',
                        'load-image-ios': 'blueimp-load-image/js/load-image-ios.js',
                        'load-image-meta': 'blueimp-load-image/js/load-image-meta.js',
                        'canvas-to-blob': 'blueimp-canvas-to-blob/js/canvas-to-blob.js',
                        'jquery.ui.widget': 'jquery.ui.widget/jquery.ui.widget.js',
                        'moment': 'moment/min/moment-with-locales.js'
                    }
                },
                plugins: _.union(production ? [
                    new webpack.optimize.UglifyJsPlugin({minimize: true})
                ]: [], [
                    new webpack.ProvidePlugin({
                        $: "jquery",
                        jQuery: "jquery",
                        "windows.jQuery": "jquery",
                        _: "underscore"
                    })
                ])
            };
        },
        webpackConfig: function (production) {
            var config = this.baseWebPackConfig(production);
            config.entry = _.object(_.map(this.scripts, function (scripts, url) {
                return [url, scripts];
            }));
            return config;
        }
    }
};