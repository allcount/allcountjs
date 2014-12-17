var _ = require('underscore');
var crypto = require('crypto');

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
                        throw new appUtil.CompileError('Name for action %s of entity type "%s" is not defined', id || "with unknown id", entityTypeId);
                    }
                    if (!actionTarget) {
                        throw new appUtil.CompileError('Action target for action "%s" of "%s" is not defined', id || name, entityTypeId);
                    }
                    if (!action.hasPropertyValue('perform')) {
                        throw new appUtil.CompileError('Perform function for action "%s" of "%s" is not defined', id || name, entityTypeId);
                    }
                    return { //TODO permissions
                        id: id || ('action-' + actionIdCounter++),
                        name: name,
                        perform: function (selectedItemIds) {
                            if (actionTarget === 'all-items') {
                                return injection.inScope({
                                    actionContext: {
                                        entityCrudId: entityDescriptionService.entityTypeIdCrudId(entityTypeId)
                                    }
                                }, function () {
                                    return action.propertyValue('perform');
                                });
                            } else {
                                throw new Error('Unknown actionTarget: ' + actionTarget);
                            }
                        },
                        actionTarget: actionTarget
                    }
                });
            });
        },
        actionListFor: function (entityCrudId, actionTarget) {
            return entityDescriptionService.entityDescription(entityCrudId).actions.filter(function (action) { //TODO permission filtering
                return action.actionTarget === actionTarget;
            }).map(function (action) {
                return {
                    id: action.id,
                    name: action.name
                }
            });
        },
        performAction: function (entityCrudId, actionId, selectedItemIds) {
            var action = _.find(entityDescriptionService.entityDescription(entityCrudId).actions, function (action) { //TODO permission filtering
                return action.id === actionId;
            });
            if (!action) {
                throw new Error('Action with id "' + actionId + '" not found for entity crud id: ' + JSON.stringify(entityCrudId));
            }
            return action.perform(selectedItemIds);
        }
    }
};