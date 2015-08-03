#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));
var injection = require('./services/injection');
var _ = require('lodash');

var port = argv.port || process.env.PORT || 9080;
var gitUrl = argv.git || process.env.GIT_URL;
var dbUrl = argv.db || process.env.DB_URL;

if (!gitUrl || !dbUrl) {
    console.log('Usage: allcountjs --git <Application Git URL> --db <Application MongoDB URL> -port [Application HTTP port]');
    process.exit(0);
}

require('./allcount-server.js');
injection.bindFactory('port', port);
injection.bindFactory('dbUrl', dbUrl);
if (dbUrl.indexOf('postgres') !== -1) {
    injection.bindFactory('storageDriver', require('./services/sql-storage-driver'));
    injection.bindFactory('dbClient', 'pg');
}
injection.bindFactory('gitRepoUrl', gitUrl);

injection.installModulesFromPackageJson("package.json");

var server = injection.inject('allcountServerStartup');
server.startup(function (errors) {
    if (errors) {
        if (_.isArray(errors)) {
            throw new Error(errors.join('\n'));
        } else {
            throw errors;
        }
    }
});