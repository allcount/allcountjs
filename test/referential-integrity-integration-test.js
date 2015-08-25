var integrationTests = require('./integration-test');
var injection = require('../services/injection.js');
var assert = require('assert');

exports.referentialIntegrityDisabledTest = function (test) {
    integrationTests(test, 'referential-integrity-disabled', function () {
        var fooCrud = injection.inject('Crud').crudForEntityType('Foo');
        var barCrud = injection.inject('Crud').crudForEntityType('Bar');
        return fooCrud.createEntity({id: '1', fooField: 'fooValue'}).then(function () {
            return barCrud.createEntity({id: '1', barField: {id: '1'}});
        }).then(function () {
            return fooCrud.deleteEntity('1')
        }).then(function () {
            return fooCrud.readEntity('1');
        }, function (err) {
            assert.fail('delete fails', 'delete should be successful', err, '!=');
        }).then(function (entity) {
            if (entity) {
                assert.fail('delete fails', 'delete should be successful', 'should not fail because referential integrity is disabled', '!=');
            } else {
                assert.ok(true);
            }
        });
    });
};

exports.referentialIntegrityEnabledTest = function (test) {
    integrationTests(test, 'referential-integrity-enabled', function () {
        var fooCrud = injection.inject('Crud').crudForEntityType('Foo');
        var barCrud = injection.inject('Crud').crudForEntityType('Bar');
        return fooCrud.createEntity({id: '1', fooField: 'fooValue'}).then(function () {
            return barCrud.createEntity({id: '1', barField: {id: '1'}});
        }).then(function () {
            return fooCrud.deleteEntity('1')
        }).then(function () {
            assert.fail('entity deleted successfully', 'error should be thrown', 'should fail due to referential integrity is enabled', '!=');
        }, function (err) {
            assert.ok(err);
        });
    });
};

exports.referentialIntegrityEnabledAndAllowDeleteWhenNotReferencedTest = function (test) {
    integrationTests(test, 'referential-integrity-enabled', function () {
        var fooCrud = injection.inject('Crud').crudForEntityType('Foo');
        return fooCrud.createEntity({id: '1', fooField: 'fooValue'}).then(function () {
            return fooCrud.deleteEntity('1')
        }).then(function () {
            return fooCrud.readEntity('1');
        }, function (err) {
            assert.fail('delete fails', 'delete should be successful', err, '!=');
        }).then(function (entity) {
            if (entity) {
                assert.fail('delete fails', 'delete should be successful', 'should not fail because no references to this entity', '!=');
            } else {
                assert.ok(true);
            }
        });
    });
};
