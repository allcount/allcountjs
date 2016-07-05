var _ = require('underscore');
var Q = require('q');

module.exports = function (storageDriver, entityDescriptionService, referenceService) {
    var service = {};

    var migrations = [];
    var migrationsTableDescription = {
        entityTypeId: "migrations",
        tableName: "migrations",
        fields: {
            name: {
                fieldType: {
                    id: 'text'
                }
            }
        }
    };

    service.compile = function (objects, errors) {
        migrations = _.chain(objects).map(function (obj) {
            return obj.propertyValue('migrations') || [];
        }).flatten().map(function (m) { return m.evaluateProperties() }).value();
        return storageDriver.addOnConnectListener(function () {
            return storageDriver.findAll(migrationsTableDescription,
                {
                    filtering: {
                        op: "in",
                        value: migrations.map(function (migration) {
                            return migration.name;
                        })
                    }
                }
            ).then(function (alreadyRun) {
                var alreadyRunHash = {};
                alreadyRun.forEach(function (migration) {
                    alreadyRunHash[migration.name] = migration;
                });
                var toRun = migrations.filter(function (m) {
                    return !alreadyRunHash[m.name];
                });
                return toRun.map(function (migration) {
                    return function () {
                        var promise;
                        if (migration.operation.id === "insert") {
                            promise = Q.all(migration.operation.entities.map(function (entity) {
                                var crudId = entityDescriptionService.entityTypeIdCrudId(migration.operation.entityTypeId);
                                return referenceService.resolveReferenceValues(crudId, entity).then(function () { //TODO could remove because already done in beforeSave ?
                                    return storageDriver.createEntity(entityDescriptionService.tableDescription(crudId), entity);
                                });
                            }))
                        }
                        if (promise) {
                            return promise.then(function () {
                                return storageDriver.createEntity(migrationsTableDescription, {name: migration.name}); //TODO save/check checksums
                            })
                        }
                        throw new Error("Undefined operation id: '" + migration.operation.id + "'");
                    }
                }).reduce(Q.when, Q(null));
            });
        });
    };

    return service;
};