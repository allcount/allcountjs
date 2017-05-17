var assert = require('assert');
var injection = require('../services/injection.js');

exports.gutter = function (test) {
    injection.resetInjection();
    var queryService = injection.inject('queryParseService');

    assert.deepEqual(queryService.parseFiltering('foo = false'), {args: [{id: 'foo'}, false], operator: '='});
    test.done();
};

exports.pathWithFun = function (test) {
    injection.resetInjection();
    var queryService = injection.inject('queryParseService');

    assert.deepEqual(queryService.parseValueExpression('sum(invoices.total)'), {fun: "sum", args: [{path: ['invoices', 'total']}]});
    test.done();
};