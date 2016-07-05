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

        console.log("Making clean up for integration tests");
        return deferred.promise.then(function (db) {
            console.log("Making clean up: connected");
            return Q.nbind(db.dropDatabase, db)().then(function () {
                console.log("Making clean up: dropped db");
                return Q.nbind(mongoose.disconnect, mongoose)().then(function () {
                    console.log("Making clean up: success");
                    //mongoose.connections = [];
                })
            });
        });
    };

    cleanUp().then(function () {
        console.log("Starting server for integration tests");
        var allcountServer = require('../allcount-server.js');

        injection.resetInjection();
        injection.bindFactory('port', 9080);
        injection.bindFactory('dbUrl', dbUrl);
        injection.bindFactory('gitRepoUrl', 'test-fixtures/' + fixtureName);

        allcountServer.reconfigureAllcount();
        return allcountServer.inject('allcountServerStartup');
    }).then(function (server) {
        console.log("Starting server: injection config done");
        return Q.nbind(server.startup, server)().then(function (errors) {
            console.log("Starting server: success");
            if (errors) {
                throw new Error(errors.join('\n'));
            }
            return Q(testFn()).then(function () {
                console.log("Stopping server...");
                return server.stop().then(function () {
                    console.log("Stopping server: ok!");
                    injection.resetInjection();
                });
            });
        });
    }).finally(cleanUp).then(function () {
        test.done();
    }, function (err) {
        test.done(err);
    })
};