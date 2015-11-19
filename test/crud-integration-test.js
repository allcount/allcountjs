var integrationTests = require('./integration-test');
var injection = require('../services/injection.js');
var assert = require('assert');

exports.crudTest = function (test) {
    integrationTests(test, 'crud-1', function () {
        var crud = injection.inject('Crud').crudForEntityType('Foo');
        return crud.createEntity({foo: "bar"}).then(function (id) {
            return crud.readEntity(id).then(function (entity) {
                assert.equal(entity.bar, "Some bar");
                assert.equal(entity.foo, "Another Some bar");
            })
        })
    })
};