var _ = require('underscore');
var Q = require('q');

module.exports = function (entityDescriptionService, storageDriver) {
    return {
        compile: function (objects, errors) {
            var self = this;
            _.forEach(entityDescriptionService.entityDescriptions, function (description, rootEntityTypeId) {
                if (description.crudHooks) {
                    if (description.crudHooks.before) {
                        self.setupListeners('addBeforeCrudListener', description.crudHooks.before, description);
                    }
                    if (description.crudHooks.after) {
                        self.setupListeners('addAfterCrudListener', description.crudHooks.after, description);
                    }
                }
            });
        },
        setupListeners: function (addListenerMethod, hooks, description) {
            var self = this;
            function defaultScope(oldEntity, newEntity) { return {OldEntity: oldEntity, NewEntity: newEntity, Entity: newEntity} }
            self.installListener(
                addListenerMethod, description, hooks, 'save',
                defaultScope,
                function (oldEntity, newEntity) { return !!newEntity }
            );
            self.installListener(
                addListenerMethod, description, hooks, 'create',
                defaultScope,
                function (oldEntity, newEntity) { return !!newEntity && !oldEntity }
            );
            self.installListener(
                addListenerMethod, description, hooks, 'update',
                defaultScope,
                function (oldEntity, newEntity) { return !!newEntity && !!oldEntity}
            );
            self.installListener(
                addListenerMethod, description, hooks, 'delete',
                function (oldEntity, newEntity) { return {OldEntity: oldEntity, NewEntity: newEntity, Entity: oldEntity} },
                function (oldEntity, newEntity) { return !newEntity && !!oldEntity}
            );
        },
        installListener: function (addListenerMethod, description, hooks, listenerProp, scopeFn, conditionFn) {
            if (hooks[listenerProp]) {
                storageDriver[addListenerMethod](description.tableDescription, function (oldEntity, newEntity) {
                    if (conditionFn(oldEntity, newEntity)) {
                        return Q(hooks[listenerProp](scopeFn(oldEntity, newEntity)));
                    }
                });
            }
        }
    }
};