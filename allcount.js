#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));
var injection = require('./services/injection');
var _ = require('underscore');
var Q = require('q');
var Keygrip = require('keygrip');
var http = require('http');
var https = require('https');
var fs = require('fs');
var os = require('os');
var util = require('util');
var crypto = require('crypto');

var port = argv.port || process.env.PORT || 9080;
var gitUrl = argv.git || process.env.GIT_URL;
var dbUrl = argv.db || process.env.DB_URL;

if (!gitUrl || !dbUrl) {
    console.dir(argv);
    console.log('Usage: allcountjs --git <Application Git URL> --db <Application MongoDB URL> -port [Application HTTP port]');
    process.exit(0);
}

injection.bindFactory('keygrip', function () {
    return Keygrip([crypto.randomBytes(30).toString('hex')]); //TODO load rotating keys from somewhere
});
injection.bindFactory('sessionMiddleware', function (keygrip) { return require('cookie-session')({keys: keygrip}) });

injection.bindFactory('port', port);
injection.bindFactory('httpServer', function () {
    return function (handler, onReady) {
        http.createServer(handler).listen(port, onReady);
    }
});
injection.bindFactory('dbUrl', dbUrl);
injection.bindFactory('gitRepoUrl', gitUrl);
injection.bindFactory('proxyHandler', function () { return function (req, res, next) { next() } });
injection.bindMultiple('appConfigurators', []);
injection.bindFactory('halt', function () {
    return function (cause) {
        console.log(util.format('Exiting app "%s"%s...'), gitUrl, cause ? " (" + cause + ")" : "");
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