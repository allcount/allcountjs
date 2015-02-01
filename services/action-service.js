var _ = require('underscore');
var crypto = require('crypto');
var Q = require('q');

module.exports = function (entityDescriptionService, injection, appUtil) {
    return {
        compile: function () {
            _.forEach(entityDescriptionService.entityDescriptions, function (description, entityTypeId) {
                var actionIdCounter = 1;
                description.actions = (description.actions || []).map(function (action) {
                    var name = action.propertyValue('name');
                    var id = action.propertyValue('id');
                    var actionTarget = action.propertyValue('actionTarget');
                    if (!name) {
                        throw new appUtil.CompileError('`name` for action %s of entity type "%s" is not defined', id || "with unknown id", entityTypeId);
                    }
                    if (!actionTarget) {
                        throw new appUtil.CompileError('`actionTarget` for action "%s" of "%s" is not defined', id || name, entityTypeId);
                    }
                    if (!action.hasPropertyValue('perform')) {
                        throw new appUtil.CompileError('`perform()` function for action "%s" of "%s" is not defined', id || name, entityTypeId);
                    }
                    return { //TODO permissions
                        id: id || ('action-' + actionIdCounter++),
                        name: name,
                        perform: function (selectedItemIds) {
                            if (actionTarget === 'all-items') {
                                return invokePerform({
                                    entityCrudId: entityDescriptionService.entityTypeIdCrudId(entityTypeId)
                                });
                            } else if (actionTarget === 'single-item') {
                                return invokePerform({
                                    entityCrudId: entityDescriptionService.entityTypeIdCrudId(entityTypeId),
                                    entityId: selectedItemIds[0]
                                });
                            } else {
                                throw new Error('Unknown actionTarget: ' + actionTarget);
                            }
                        },
                        isEnabled: function () {
                            return Q(action.hasPropertyValue('enabled') ? action.evaluatedValue('enabled') : true).then(function (v) { return !!v });
                        },
                        actionTarget: actionTarget
                    };

                    function invokePerform(actionContext) {
                        return injection.inScope({
                            actionContext: actionContext
                        }, function () {
                            return action.propertyValue('perform');
                        });
                    }
                });
            });
        },
        actionListFor: function (entityCrudId, actionTarget) {
            return Q.all(entityDescriptionService.entityDescription(entityCrudId).actions.filter(function (action) { //TODO permission filtering
                return action.actionTarget === actionTarget;
            }).map(function (action) {
                return action.isEnabled().then(function (isEnabled) {
                    return {
                        id: action.id,
                        name: action.name,
                        isEnabled: isEnabled
                    }
                });
            }));
        },
        performAction: function (entityCrudId, actionId, selectedItemIds) {
            var action = _.find(entityDescriptionService.entityDescription(entityCrudId).actions, function (action) { //TODO permission filtering
                return action.id === actionId;
            });
            if (!action) {
                throw new Error('Action with id "' + actionId + '" not found for entity crud id: ' + JSON.stringify(entityCrudId));
            }
            if (!action.isEnabled()) {
                throw new Error('Action with id "' + actionId + '" is not enabled');
            }
            return action.perform(selectedItemIds);
        }
    }
};