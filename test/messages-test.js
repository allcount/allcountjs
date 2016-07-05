var integrationTests = require('./integration-test');
var injection = require('../services/injection.js');
var assert = require('assert');

exports.crudTest = function (test) {
    integrationTests(test, 'force-locale-defined-in-config', function () {
        injection.inject('messagesService').messages();
    })
};