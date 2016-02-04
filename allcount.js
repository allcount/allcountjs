#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));
var injection = require('./services/injection');
var _ = require('lodash');
var fs = require('fs');
var crypto = require('crypto');
var Keygrip = require('keygrip');

var port = argv.port || process.env.PORT || 9080;
var gitUrl = argv.app || process.env.APP || argv.git || process.env.GIT_URL;
var dbUrl = argv.db || process.env.DB_URL;

if (!gitUrl || !dbUrl) {
    console.log('Usage: allcountjs --app <Path to application\'s dir or Git URL> --db <Application MongoDB URL> -port [Application HTTP port]');
    process.exit(0);
}

require('./allcount-server.js');
var keygrip = Keygrip([crypto.randomBytes(30).toString('hex')]); //TODO load rotating keys from somewhere

function reconfigure() {
    injection.resetInjection();
    require('./allcount-server.js').reconfigureAllcount();
    injection.bindFactory('port', port);
    injection.bindFactory('dbUrl', dbUrl);
    if (dbUrl.indexOf('postgres') !== -1) {
        injection.bindFactory('storageDriver', require('./services/sql-storage-driver'));
        injection.bindFactory('dbClient', 'pg');
    }
    injection.bindFactory('gitRepoUrl', gitUrl);

    if (fs.existsSync("package.json")) {
        injection.installModulesFromPackageJson("package.json");
    }

    injection.bindFactory('keygrip', function () {
        return keygrip;
    });
}

reconfigure();
var hotReload = injection.inject('hotReload');

hotReload.init(function (errors) {
    if (errors) {
        if (_.isArray(errors)) {
            throw new Error(errors.join('\n'));
        } else {
            throw errors;
        }
    }
}, reconfigure);

var fsmonitor = require('fsmonitor');

hotReload.start().then(function () {
    if (process.env.NODE_ENV !== 'production') {
        var monitor = fsmonitor.watch(gitUrl, {
            matches: function(relpath) {
                return relpath.match(/\.js$/i) !== null;
            },
            excludes: function(relpath) {
                return relpath.match(/^\.git$/i) !== null;
            }
        });
        monitor.on('change', function(changes) {
            hotReload.reload().catch(function (err) {
                if (err.length) {
                    console.error(err.join('\n'));
                } else {
                    console.error(err);
                }
            });
        });
    }
}).done();

