var _ = require('underscore');
var Q = require('q');

module.exports = function (loopback, loopbackApp, crudHookUtil, storageDriver, injection) {
    return {
        entity: function (entityTypeId, persistenceEntityTypeId) {
            return function (description) {
                crudHookUtil.invokeCrudHooks(description, function (prefix, method, hookFn) {
                    loopback.getModel(persistenceEntityTypeId).observe(prefix + ' ' + (method === 'Delete' ? 'delete' : 'save'), function (ctx, next) {
                        var entityDescriptionService = injection.inject('entityDescriptionService');
                        if (ctx.isNewInstance === true && method === 'Create' ||
                            ctx.isNewInstance === false && method === 'Update' ||
                            method === 'Save' || method === 'Delete') {
                            Q.all([ctx.instance, ctx.currentInstance].map(function (e) {
                                return e ? storageDriver.prefetchReferencesAndConvertFromStorage(entityDescriptionService.tableDescription(entityTypeId), e).then(function (e) {
                                    return Object.create(e);
                                }) : null;
                            })).then(function (instanceAndCurrent) {
                                var scope = method !== 'Delete' ? {
                                    Entity: instanceAndCurrent[0],
                                    NewEntity: instanceAndCurrent[0],
                                    OldEntity: instanceAndCurrent[1]
                                } : {
                                    Entity: instanceAndCurrent[0],
                                    OldEntity: instanceAndCurrent[0]
                                };
                                return hookFn(scope).then(function () {
                                    storageDriver.updateInstance(
                                        entityDescriptionService.tableDescription(entityTypeId),
                                        _.extendOwn({}, instanceAndCurrent[0]),
                                        ctx.instance
                                    );
                                })
                            }).nodeify(next);
                        } else {
                            next();
                        }
                    })
                })
            }
        }
    }
};