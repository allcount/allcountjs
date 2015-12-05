var _ = require('underscore');

module.exports = function (queryParseService, securityConfigService, appUtil, injection, Queries, entityDescriptionCompilers) {
    var service = {};

    function CompiledField(field) {
        var self = this;
        _.forEach(field, function (value, prop) {
            if (field.hasOwnProperty(prop)) {
                self[prop] = value;
            }
        });
    }

    CompiledField.prototype.isForwardReference = function () {
        return this.fieldType.id === 'reference';
    };

    CompiledField.prototype.isBackReference = function () {
        return this.fieldType.id === 'relation';
    };

    CompiledField.prototype.readOnly = function () {
        return !!(this.isReadOnly || this.computeExpression);
    };

    CompiledField.prototype.referenceEntityTypeId = function () {
        if (this.fieldType.id === 'reference') {
            return this.fieldType.referenceEntityTypeId
        } else if (this.fieldType.id === 'relation') {
            return this.fieldType.relationEntityTypeId;
        } else {
            return undefined;
        }
    };

    service.compile = function(objects, errors) {
        service.entityDescriptions = {};
        var entityTypeIdToDescription = {};
        var entityTypeIdToPersistenceEntityTypeId = {};

        function addToChain(description, entityTypeId, persistenceEntityTypeId, parentEntityTypeId) {
            if (parentEntityTypeId && entityTypeIdToDescription[parentEntityTypeId]) {
                entityTypeIdToDescription[entityTypeId] = description.withParent(entityTypeIdToDescription[parentEntityTypeId]);
            } else if (entityTypeIdToDescription[entityTypeId]) {
                entityTypeIdToDescription[entityTypeId] = description.withParent(entityTypeIdToDescription[entityTypeId]);
            } else {
                entityTypeIdToDescription[entityTypeId] = description;
            }
            if (entityTypeIdToPersistenceEntityTypeId[entityTypeId] &&
                entityTypeIdToPersistenceEntityTypeId[entityTypeId] !== persistenceEntityTypeId) {
                throw new Error("Parent for " + entityTypeId + " can't be changed from " + entityTypeIdToPersistenceEntityTypeId[entityTypeId] + " to " + persistenceEntityTypeId);
            }
            entityTypeIdToPersistenceEntityTypeId[entityTypeId] = persistenceEntityTypeId;
        }

        objects.forEach(function (obj) {
            if (!obj.propertyValue('entities')) {
                return;
            }
            _.forEach(obj.propertyValue('entities').propertyValues(), function (description, entityTypeId) {
               addToChain(description, entityTypeId, entityTypeId);
            });
        });

        objects.forEach(function (obj) {
            if (!obj.propertyValue('entities')) {
                return;
            }
            _.forEach(obj.propertyValue('entities').propertyValues(), function (description, entityTypeId) {
                var views = description.propertyValue('views');
                if (views) {
                    _.forEach(views.propertyValues(), function (viewDescription, viewTypeId) {
                        addToChain(viewDescription, viewTypeId, entityTypeId, entityTypeId);
                    });
                }
            });
        });

        _.forEach(entityTypeIdToDescription, function (description, entityTypeId) {
            compileEntityTypeId(entityTypeId, description, entityTypeIdToPersistenceEntityTypeId[entityTypeId]);
        });

        function compileEntityTypeId(entityTypeId, description, persistenceEntityTypeId) {
            var permissions = description.propertyValue('permissions');
            compileEntityTypeByEvaluated({
                entityTypeId: entityTypeId,
                evaluatedFields: description.propertyValue('fields').evaluateProperties(),
                persistenceEntityTypeId: persistenceEntityTypeId,
                referenceNameExpression: description.propertyValue('referenceName'),
                filteringExpression: function () {
                    var filteringValue = description.evaluatedValue('filtering');
                    return _.isString(filteringValue) && queryParseService.prepareQuery(filteringValue) || filteringValue && filteringValue.filtering && {filtering: filteringValue.filtering} || filteringValue && {query: filteringValue};
                },
                permissions: permissions && permissions.evaluateProperties(),
                showInGrid: description.arrayPropertyValue('showInGrid'),
                sorting: description.arrayPropertyValue('sorting'), //TODO additional structure checks,
                actions: description.arrayPropertyValue('actions'),
                title: description.propertyValue('title'),
                customView: description.stringPropertyValue('customView'),
                layout: description.evaluatedValue('layout'),
                crudHooks: prepareCrudHooks(description),
                disableReferentialIntegrity: description.propertyValue('disableReferentialIntegrity')
            });
            entityDescriptionCompilers.forEach(function (compiler) {
                var invokeOn = compiler.entity(entityTypeId, persistenceEntityTypeId || entityTypeId);
                if (_.isFunction(invokeOn)) {
                    invokeOn(description);
                } else {
                    description.invokePropertiesOn(invokeOn);
                }
            })
        }

        function prepareCrudHooks(description) {
            var prefixes = ['before', 'after'];
            var hookNames = ['Save', 'Create', 'Update', 'Delete'];
            var hooks = prefixes.map(function (prefix) {
                var methods = hookNames.map(function (method) {
                    if (description.hasOwnPropertyValue(prefix + method)) {
                        return [method.toLowerCase(), function (scope) {
                            return injection.inScope(scope, function () {
                                return description.evaluatedValue(prefix + method);
                            });
                        }];
                    }
                }).filter(_.identity);
                if (methods.length) {
                    return [prefix, _.object(methods)]
                }
            }).filter(_.identity);
            if (hooks.length) {
                return _.object(hooks);
            }
        }

        function compileEntityTypeByEvaluated(evaluated) {
            service.entityDescriptions[evaluated.entityTypeId] = {
                fields: _.map(evaluated.evaluatedFields, function (field, fieldName) { return compileFieldForClient(new CompiledField(field), fieldName, evaluated.showInGrid) }),
                tableDescription: {
                    tableName: evaluated.persistenceEntityTypeId || evaluated.entityTypeId,
                    entityTypeId: evaluated.entityTypeId,
                    fieldsToSelectForReferenceName: [evaluated.referenceNameExpression],
                    referenceName: function (entity) {
                        return entity[evaluated.referenceNameExpression];
                    }
                },
                allFields: _.object(_.map(evaluated.evaluatedFields, function (field, fieldName) { return [fieldName, new CompiledField(field)] })),
                referenceNameExpression: evaluated.referenceNameExpression,
                filtering: evaluated.filteringExpression,
                permissions: evaluated.permissions,
                sorting: evaluated.sorting,
                actions: evaluated.actions,
                title: evaluated.title,
                customView: evaluated.customView,
                layout: evaluated.layout,
                crudHooks: evaluated.crudHooks,
                disableReferentialIntegrity: evaluated.disableReferentialIntegrity
            };
            var persistedFields = {};
            _.each(evaluated.evaluatedFields, function (field, fieldName) {
                if (!field.fieldType.notPersisted) {
                    persistedFields[fieldName] = field;
                }
            });
            service.entityDescriptions[evaluated.entityTypeId].tableDescription.fields = persistedFields;
        }

        function compileFieldForClient(field, fieldName, showInGrid) {
            return {
                field: fieldName,
                name: field.name,
                hideInGrid: field.hideInGrid || showInGrid && showInGrid.indexOf(fieldName) === -1,
                fieldTypeId: field.fieldType.id, //TODO remove?
                fieldType: field.fieldType,
                isReadOnly: field.readOnly()
            }
        }
    };

    service.entityDescription = function (entityCrudId) {
        if (_.isString(entityCrudId)) {
            entityCrudId = service.entityTypeIdCrudId(entityCrudId);
        }
        var result = undefined;
        if (entityCrudId.relationField) {
            var entityTypeId = service.entityDescriptions[entityCrudId.entityTypeId].allFields[entityCrudId.relationField].fieldType.relationEntityTypeId;
            result = service.entityDescriptions[entityTypeId];
        } else {
            result = service.entityDescriptions[entityCrudId.entityTypeId];
        }
        if (!result) {
            throw new Error("Can't find entity description for " + JSON.stringify(entityCrudId));
        }
        return result;
    };

    service.hasEntityDescription = function (entityTypeId) {
        return !!service.entityDescriptions[entityTypeId];
    };

    service.fieldDescriptions = function (entityCrudId) {
        var user = injection.inject('User', true);
        var readPermissionFilteredFields = service.readPermissionFilteredFields(entityCrudId, user);
        var writePermissionFilteredFields = service.writePermissionFilteredFields(entityCrudId, user);
        return service.entityDescription(entityCrudId).fields.filter(function (field) {
            return readPermissionFilteredFields[field.field];
        }).map(function (field) {
            field = _.clone(field);
            field.isReadOnly = field.isReadOnly || !writePermissionFilteredFields[field.field];
            return field;
        });
    };

    service.tableDescription = function (entityCrudId) {
        return service.entityDescription(entityCrudId).tableDescription;
    };

    service.userHasReadAccess = userHasAccessTo('read');

    service.userHasWriteAccess = userHasAccessTo('write', service.userHasReadAccess.bind(service));

    service.userHasCreateAccess = userHasAccessTo('create', service.userHasWriteAccess.bind(service));

    service.userHasUpdateAccess = userHasAccessTo('update', service.userHasWriteAccess.bind(service));

    service.userHasDeleteAccess = userHasAccessTo('delete', service.userHasWriteAccess.bind(service));

    service.permissionFilteredFields = function (permission, parentPermissionFn) {
        return function (entityCrudId, user) {
            return _.chain(service.entityDescription(entityCrudId).allFields).map(function (field, fieldName) {
                var hasAccess = userHasAccessTo(permission, parentPermissionFn && parentPermissionFn(field.permissions), function () {
                    return field.permissions;
                })(entityCrudId, user);
                if (hasAccess) {
                    return [fieldName, field];
                } else {
                    return undefined;
                }
            }).filter(_.identity).object().value();
        }
    };

    service.readPermissionFilteredFields = service.permissionFilteredFields('read');
    service.writePermissionFilteredFields = service.permissionFilteredFields('write', function (permissions) {
        return userHasAccessTo('read', undefined, function () { return permissions });
    });

    function userHasAccessTo(permission, parentPermissionFn, permissionsGetFn) {
        return function (entityCrudId, user) {
            var permissions = permissionsGetFn ? permissionsGetFn() : service.entityDescription(entityCrudId).permissions;
            return (permissions && !_.isUndefined(permissions[permission])) ? !permissions[permission] || user && _.any(permissions[permission], function (role) {
                return user.hasRole(role);
            }) : (!parentPermissionFn || parentPermissionFn(entityCrudId, user));
        }
    }

    service.entityTypeIdCrudId = function (entityTypeId) {
        return {entityTypeId: entityTypeId};
    };

    return service;
};