var integrationTests = require('./integration-test');
var injection = require('../services/injection.js');
var assert = require('assert');
var Q = require('q');
var _ = require('underscore');

exports.permissionsTest = function (test) {
    integrationTests(test, 'field-permissions', function () {
        var securityService = injection.inject('securityService');
        var entityDescriptionService = injection.inject('entityDescriptionService');
        var userCrud = injection.inject('crudService').systemStrategyForCrudId({entityTypeId: 'User'});
        return Q.all([
            userCrud.createEntity({username: 'manager', role_manager: true}),
            userCrud.createEntity({username: 'owner', role_owner: true})
        ]).then(function () {
            var crud = injection.inject('Crud').crudForEntityType('Foo');
            return crud.createEntity({foo: "bar", bar: 'should filter out', ownerOnly: 'should filter out'}).then(function (id) {
                return crud.readEntity(id).then(function (entity) {
                    assert.equal(entity.foo, "bar");
                    assert.equal(entity.bar, undefined);
                    assert.equal(entity.ownerOnly, undefined);
                }).then(function () {
                    return securityService.withUserScopeByName('manager', function () {
                        var fieldDescriptions = entityDescriptionService.fieldDescriptions(entityDescriptionService.entityTypeIdCrudId('Foo'));
                        assert.equal(_.find(fieldDescriptions, function (f) { return f.field === 'bar'}).isReadOnly, false);

                        return crud.updateEntity({id: id, bar: 'manager', ownerOnly: 'should filter out'}).then(function (withBar) {
                            assert.equal(withBar.bar, 'manager');
                            assert.equal(withBar.ownerOnly, undefined);
                        })
                    }).then(function () {
                        var fieldDescriptions = entityDescriptionService.fieldDescriptions(entityDescriptionService.entityTypeIdCrudId('Foo'));
                        assert.equal(_.find(fieldDescriptions, function (f) { return f.field === 'bar'}).isReadOnly, true);

                        return crud.readEntity(id).then(function (entity) {
                            assert.equal(entity.bar, 'manager');
                        })
                    })
                }).then(function () {
                    return securityService.withUserScopeByName('owner', function () {
                        return crud.updateEntity({id: id, ownerOnly: 'owner'}).then(function (entity) {
                            assert.equal(entity.ownerOnly, 'owner');
                        })
                    }).then(function () {
                        return crud.readEntity(id).then(function (entity) {
                            assert.equal(entity.ownerOnly, undefined);
                        })
                    })
                })
            })
        });
    })
};

exports.createOnlyTest = function (test) {
    integrationTests(test, 'field-permissions', function () {
        var securityService = injection.inject('securityService');
        var entityDescriptionService = injection.inject('entityDescriptionService');
        var userCrud = injection.inject('crudService').systemStrategyForCrudId({entityTypeId: 'User'});
        return Q.all([
            userCrud.createEntity({username: 'manager', role_manager: true})
        ]).then(function () {
            var crud = injection.inject('Crud').crudForEntityType('CreateOnly');
            return crud.createEntity({foo: "1", bar: '2'}).then(function (id) {
                return securityService.withUserScopeByName('manager', function () {
                    return crud.readEntity(id).then(function (entity) {
                        assert.equal(entity.foo, "1");
                        assert.equal(entity.bar, "2");
                    });
                });
            })
        });
    })
};