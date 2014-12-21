#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));
var injection = require('./services/injection');

var port = argv.port || process.env.PORT || 9080;
var gitUrl = argv.git || process.env.GIT_URL;
var dbUrl = argv.db || process.env.DB_URL;

if (!gitUrl || !dbUrl) {
    console.log('Usage: allcountjs --git <Application Git URL> --db <Application MongoDB URL> -port [Application HTTP port]');
    process.exit(0);
}

injection.bindFactory('port', port);
injection.bindFactory('dbUrl', dbUrl);
injection.bindFactory('gitRepoUrl', gitUrl);

var server = require('./allcount-server.js').inject('allcountServerStartup');
server.startup(function (errors) {
    if (errors) {
        throw new Error(errors.join('\n'));
    }
});