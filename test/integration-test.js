var injection = require('../services/injection.js');
var Q = require('q');
var mongoose = require('mongoose');

module.exports = function (test, fixtureName, testFn) {
    var dbUrl = 'mongodb://localhost:27017/' + fixtureName;

    var cleanUp = function () {
        var deferred = Q.defer();
        var connection = mongoose.createConnection(dbUrl);

        connection.on('connected', function () {
            deferred.resolve(connection.db);
        });

        return deferred.promise.then(function (db) {
            return Q.nbind(db.dropDatabase, db)().then(function () {
                db.close();
            });
        });
    };

    cleanUp().then(function () {
        var allcountServer = require('../allcount-server.js');

        injection.resetInjection();
        injection.bindFactory('port', 9080);
        injection.bindFactory('dbUrl', dbUrl);
        injection.bindFactory('gitRepoUrl', 'test-fixtures/' + fixtureName);

        allcountServer.reconfigureAllcount();
        return allcountServer.inject('allcountServerStartup');
    }).then(function (server) {
        return Q.nbind(server.startup, server)().then(function (errors) {
            if (errors) {
                throw new Error(errors.join('\n'));
            }
            return Q(testFn()).then(function () {
                return server.stop().then(function () {
                    injection.resetInjection();
                });
            });
        });
    }).finally(cleanUp).finally(function () {
        test.done();
    }).done();
};