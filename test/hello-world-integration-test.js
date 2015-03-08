var assert = require('assert');
var injection = require('../services/injection.js');
var fs = require('fs');
var integrationTests = require('./integration-test');

exports.helloWorldTest = function (test) {
    integrationTests(test, 'hello-world', function () {});
};