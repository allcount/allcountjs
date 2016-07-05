var integrationTests = require('./integration-test');
var injection = require('../services/injection.js');
var assert = require('assert');

exports.pipesTest = function (test) {
    integrationTests(test, 'pipes', function () {
        var pipes = injection.inject('Pipes');
        var keyFn = function (i) { return i.fooId };
        var crud = injection.inject('Crud').crudFor('Foo');
        return pipes.oneWayImportSync([{fooId: "1", bar: "some"}, {fooId: "2", bar: "another"}], 'Foo', {}, {keyFn: keyFn, batchSize: 1}).then(function () {
            return crud.find({}).then(function (items) {
                assert.equal(items.length, 2);
            })
        }).then(function () {
            return pipes.oneWayImportSync([{fooId: "2", bar: "new"}], 'Foo', {}, {keyFn: keyFn, batchSize: 1}).then(function () {
                return crud.find({}).then(function (items) {
                    assert.equal(items.length, 1);
                    assert.equal(items[0].bar, "new");
                })
            })
        })
    })
};