'use strict';

var webpack = require('webpack'),
    HtmlWebpackPlugin = require('html-webpack-plugin'),
    path = require('path'),
    srcPath = path.join(__dirname, 'react');

module.exports = {
    target: 'web',
    cache: true,
    entry: {
        editor: path.join(srcPath, 'allcountjs-react-editor.js'),
        module: path.join(srcPath, 'allcountjs-react-local.js'),
        common: ['react', 'react-router']
    },
    resolve: {
        root: srcPath,
        extensions: ['', '.js'],
        modulesDirectories: ['node_modules', srcPath]
    },
    output: {
        path: path.join(__dirname, 'tmp'),
        publicPath: '', //TODO
        filename: '[name].js',
        library: ['Libs', '[name]'],
        pathInfo: true
    },

    module: {
        loaders: [
            {
                test: /\.js?$/, exclude: /node_modules/, loader: 'babel-loader',
                query: {
                    presets: ['es2015', 'react']
                }
            },
            {
                test: /\.less$/, exclude: /node_modules/, loader: 'style!css!less'
            },
            {
                test: /\.(eot|woff|woff2|ttf|svg|png|jpg|gif)$/,
                loader: 'url-loader?limit=30000&name=[name]-[hash].[ext]'
            }
        ]
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin('common', 'common.js'),
        new webpack.NoErrorsPlugin()
    ],

    debug: true,
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './tmp',
        historyApiFallback: true
    }
};