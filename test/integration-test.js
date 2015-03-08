var injection = require('../services/injection.js');
var Q = require('q');

module.exports = function (test, fixtureName, testFn) {
    var allcountServer = require('../allcount-server.js');

    injection.resetInjection();
    injection.bindFactory('port', 9080);
    injection.bindFactory('dbUrl', 'mongodb://localhost:27017/' + fixtureName);
    injection.bindFactory('gitRepoUrl', 'test-fixtures/' + fixtureName);

    allcountServer.reconfigureAllcount();
    var server = allcountServer.inject('allcountServerStartup');
    server.startup(function (errors) {
        if (errors) {
            throw new Error(errors.join('\n'));
        }
        Q(testFn()).then(function () {
            return server.stop().then(function () {
                injection.resetInjection();
                test.done();
            });
        }).done();
    });
};