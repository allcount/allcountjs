var assert = require('assert');
var injection = require('../services/injection.js');
var fs = require('fs');

exports.helloWorldTest = function (test) {
    injection.bindFactory('port', 9080);
    injection.bindFactory('dbUrl', 'mongodb://localhost:27017/hello-world');
    injection.bindFactory('gitRepoUrl', 'test-fixtures/hello-world');

    var server = require('../allcount-server.js').inject('allcountServerStartup');
    server.startup(function (errors) {
        if (errors) {
            throw new Error(errors.join('\n'));
        }
        server.stop().then(function () {
            test.done();
        });
    });
};

exports.setUp = function (callback) {
    injection.resetInjection();
    callback();
};

exports.tearDown = function (callback) {
    injection.resetInjection();
    callback();
};