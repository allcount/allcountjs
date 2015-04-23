var assert = require('assert');
var injection = require('../services/injection.js');
var fs = require('fs');

exports.resolveFuncArgsTest = function (test) {
    var result = injection.resolveFuncArgs(function (foo, bar) {
        return {foo: bar}
    }, function (arg) { return arg });
    assert.deepEqual(result, {foo: 'bar'});
    test.done();
};

exports.injectTest = function (test) {
    injection.providers = {};
    injection.bindFactory("foo", function (bar) {
        return bar;
    });
    injection.bindFactory("bar", function () {
        return 'bar';
    });
    assert.equal(injection.inject('foo'), 'bar');
    test.done();
};

exports.bindMultipleTest = function (test) {
    injection.providers = {};
    injection.bindFactory("foo", function (bar) {
        return {foo: bar};
    });
    injection.bindFactory("bar", function () {
        return 'bar';
    });
    injection.bindFactory('host', function (plugins) {
        return plugins;
    });
    injection.bindMultiple('plugins', ['foo', 'bar']);
    assert.deepEqual(injection.inject('host'), [{foo: 'bar'}, 'bar']);
    test.done();
};

exports.inScopeTest = function (test) {
    injection.providers = {};
    injection.bindFactory("foo", function (bar) {
        return bar;
    });
    injection.bindFactory("bar", function () {
        return 'bar';
    });
    injection.bindFactory('dependent', function (foo) {
        return foo;
    });
    injection.inScope({
        foo: { value: 'foo' }
    }, function () {
        assert.deepEqual(injection.inject('foo'), { value: 'foo' });
        assert.deepEqual(injection.inject('dependent'), { value: 'foo' });
    });
    injection.inScope({
        foo: { value: 'foo-foo' }
    }, function () {
        assert.deepEqual(injection.inject('foo'), { value: 'foo-foo' });
        assert.deepEqual(injection.inject('dependent'), { value: 'foo-foo' });
    });
    assert.equal(injection.inject('foo'), 'bar');
    test.done();
};

exports.inScopeOverrideTest = function (test) {
    injection.providers = {};
    injection.bindFactory("foo", function (bar) {
        return bar;
    });
    injection.bindFactory("bar", function () {
        return 'bar';
    });
    injection.bindFactory("scopedFoo", function (bar) {
        return bar;
    });
    assert.deepEqual(injection.inject('foo'), 'bar');
    injection.inScope({
        bar: { value: 'foo' }
    }, function () {
        assert.deepEqual(injection.inject('scopedFoo'), { value: 'foo' });
    });
    test.done();
};

exports.overrideTest = function (test) {
    injection.resetInjection();
    injection.bindFactory("foo", function () {
        return "bar";
    });
    injection.overrideFactory("foo", "oldFoo", function (oldFoo) {
        return oldFoo;
    });
    assert.equal(injection.inject('foo'), 'bar');
    test.done();
};

exports.overrideNotBoundTest = function (test) {
    injection.resetInjection();
    injection.addNameMatcher(/foo/, function (s) {
        return s;
    }, function (n) { return '+' + n });
    injection.overrideFactory("foo", "oldFoo", function (oldFoo) {
        return oldFoo;
    });
    assert.equal(injection.inject('foo'), '+foo');
    test.done();
};

exports.providerTest = function (test) {
    injection.resetInjection();
    var i = 1;
    injection.bindFactory("foo", function () {
        return new injection.Provider(function () {
            return i++;
        });
    });
    assert.equal(injection.inject('foo'), 1);
    assert.equal(injection.inject('foo'), 2);
    test.done();
};