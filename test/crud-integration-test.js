var integrationTests = require('./integration-test');
var injection = require('../services/injection.js');
var assert = require('assert');
var _ = require('underscore');

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

exports.crudFieldTest = function (test) {
    integrationTests(test, 'crud-field-types', function () {
        var crud = injection.inject('Crud').crudForEntityType('Foo');

        return injection.inject('Crud').crudForEntityType('Bar').createEntity({name: "bar"}).then(function (barId) {
            var entityToCreate = {
                text: "bar",
                date: new Date(),
                barReference: {id: barId.toString(), name: 'bar'},
                barMultiReference: [],
                money: "123456789",
                integer: 123456789,
                checkbox: true,
                checkboxArrayField: true,
                password: '123'
            };
            return crud.createEntity(_.clone(entityToCreate)).then(function (id) {
                return crud.readEntity(id).then(function (entity) {
                    delete entity['id'];
                    entityToCreate.password = '';
                    assert.deepEqual(entity, entityToCreate);
                })
            })
        });
    })
};