var _ = require('underscore');

module.exports = function (queryParseService, securityService, fieldsApi) {
    var service = {};

    service.compile = function(objects, errors) {
        service.entityDescriptions = {};
        objects.forEach(function (obj) {
            if (!obj.propertyValue('entities')) {
                return;
            }
            _.forEach(obj.propertyValue('entities').propertyValues(), function (description, entityTypeId) {
                compileEntityTypeId(entityTypeId, description);
                var views = description.propertyValue('views');
                if (views) {
                    _.forEach(views.propertyValues(), function (viewDescription, viewTypeId) {
                        compileEntityTypeId(viewTypeId, viewDescription.withParent(description), entityTypeId);
                    });
                }
            });
        });
        compileUserDescription();

        function compileEntityTypeId(entityTypeId, description, persistenceEntityTypeId) {
            var permissions = description.propertyValue('permissions');
            compileEntityTypeByEvaluated({
                entityTypeId: entityTypeId,
                evaluatedFields: description.propertyValue('fields').evaluateProperties(),
                persistenceEntityTypeId: persistenceEntityTypeId,
                referenceNameExpression: description.propertyValue('referenceName'),
                filteringExpression: queryParseService.parseFiltering(description.propertyValue('filtering')),
                permissions: permissions && permissions.evaluateProperties(),
                showInGrid: description.arrayPropertyValue('showInGrid'),
                sorting: description.arrayPropertyValue('sorting'), //TODO additional structure checks,
                actions: description.arrayPropertyValue('actions'),
                title: description.propertyValue('title'),
                customView: description.stringPropertyValue('customView')
            });
        }

        function compileUserDescription () {
            var fields = {};
            fields.username = fieldsApi.text('User name');
            fields.passwordHash = fieldsApi.password('Password');
            securityService.roles().forEach(function (role) {
                fields[role] = fieldsApi.checkbox(role, 'roles');
            });
            compileEntityTypeByEvaluated({
                entityTypeId: 'User',
                evaluatedFields: fields,
                persistenceEntityTypeId: 'User',
                referenceNameExpression: 'username',
                permissions: {
                    read: ['admin']
                },
                title: 'Users'
            })
        }

        function compileEntityTypeByEvaluated(evaluated) {
            service.entityDescriptions[evaluated.entityTypeId] = {
                fields: _.map(evaluated.evaluatedFields, function (field, fieldName) { return compileFieldForClient(field, fieldName, evaluated.showInGrid) }),
                tableDescription: {
                    tableName: evaluated.persistenceEntityTypeId || evaluated.entityTypeId,
                    entityTypeId: evaluated.entityTypeId
                },
                allFields: _.object(_.map(evaluated.evaluatedFields, function (field, fieldName) { return [fieldName, new CompiledField(field)] })),
                referenceNameExpression: evaluated.referenceNameExpression,
                filtering: evaluated.filteringExpression,
                permissions: evaluated.permissions,
                sorting: evaluated.sorting,
                actions: evaluated.actions,
                title: evaluated.title,
                customView: evaluated.customView
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
                fieldType: field.fieldType
            }
        }

        function CompiledField(field) {
            _.extend(this, field)
        }

        CompiledField.prototype.isForwardReference = function () {
            return this.fieldType.id === 'reference';
        };

        CompiledField.prototype.isBackReference = function () {
            return this.fieldType.id === 'relation';
        };

        CompiledField.prototype.referenceEntityTypeId = function () {
            if (this.fieldType.id === 'reference') {
                return this.fieldType.referenceEntityTypeId
            } else if (this.fieldType.id === 'relation') {
                return this.fieldType.relationEntityTypeId;
            } else {
                return undefined;
            }
        }
    };

    service.entityDescription = function (entityCrudId) {
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
        return service.entityDescription(entityCrudId).fields;
    };

    service.tableDescription = function (entityCrudId) {
        return service.entityDescription(entityCrudId).tableDescription;
    };

    service.userHasReadAccess = function (entityCrudId, user) {
        var permissions = service.entityDescription(entityCrudId).permissions;
        return permissions && permissions.read && user && _.any(permissions.read, function (role) {
            return user.hasRole(role);
        }) || !permissions || !permissions.read;
    };

    service.userHasWriteAccess = function (entityCrudId, user) {
        var permissions = service.entityDescription(entityCrudId).permissions;
        var writePermission = permissions && permissions.write && user && _.any(permissions.write, function (role) {
            return user.hasRole(role);
        }) || !permissions || !permissions.write;
        return service.userHasReadAccess(entityCrudId, user) && writePermission;
    };

    service.entityTypeIdCrudId = function (entityTypeId) {
        return {entityTypeId: entityTypeId};
    };

    return service;
};