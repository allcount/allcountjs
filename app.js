var injection = require('./services/injection');
var _ = require('underscore');
var Q = require('q');
var Keygrip = require('keygrip');
var http = require('http');
var https = require('https');
var fs = require('fs');
var os = require('os');
var util = require('util');

injection.bindFactory('keygrip', function () {
    return Keygrip(['Some']); //TODO load rotating keys from somewhere
});
injection.bindFactory('sessionMiddleware', function (keygrip) { return require('cookie-session')({keys: keygrip}) });

injection.bindFactory('port', process.env.PORT);
injection.bindFactory('httpServer', function () {
    return function (handler, onReady) {
        http.createServer(handler).listen(process.env.PORT, onReady);
    }
});
injection.bindFactory('dbUrl', process.env.DB_URL);
injection.bindFactory('gitRepoUrl', process.env.GIT_URL);
injection.bindFactory('proxyHandler', function () { return function (req, res, next) { next() } });
injection.bindMultiple('appConfigurators', []);
injection.bindFactory('halt', function () {
    return function (cause) {
        console.log(util.format('Exiting app "%s"%s...'), process.env.GIT_URL, cause ? " (" + cause + ")" : "");
        process.exit();
    };
});
injection.bindMultiple('loginMethods', []);

var server = require('./allcount-server.js').inject('allcountServerStartup');
server.startup(function (errors) {
    Q.onerror = undefined;
    if (errors) {
        throw new Error(errors.join('\n'));
    }
});