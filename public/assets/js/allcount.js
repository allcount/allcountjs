var allcountModule = angular.module("allcount", ['ngAnimate', 'blueimp.fileupload']);

window.allcountModule = allcountModule;

allcountModule.factory('track', function () {
    return lc.track;
});

allcountModule.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.interceptors.push(['$q', 'track', function($q, track) {
        return {
            responseError: function(rejection) {
                if (rejection.status !== 403) {
                    track("allcount-rest-error", {
                        url: rejection.config.url,
                        req: rejection.config.data,
                        method: rejection.config.method,
                        status: rejection.status,
                        res: rejection.data
                    });
                }
                return $q.reject(rejection);
            }
        };
    }]);
}]);

allcountModule.factory("rest", ["$http", "$q", function ($http, $q) {
    var service = {};

    function castToEntityCrudId(entityCrudId) {
        if (typeof entityCrudId == "string") {
            return {entityTypeId: entityCrudId};
        } else {
            return entityCrudId;
        }
    }

    service.getFieldDescriptions = function (entityCrudId, isGrid, successCallback) {
        if (!entityCrudId) {
            return;
        }
        var httpPromise = $http.post("/rest/field-descriptions", {entityCrudId: castToEntityCrudId(entityCrudId), isGrid: isGrid}).then(getJson).then(function (descriptions) {
            return $(descriptions).map(function (index, item) {
                if (!isGrid || !item.hideInGrid) {
                    return item;
                }
                return undefined;
            })
        });

        if (successCallback) {
            httpPromise.then(successCallback);
        }
        return httpPromise;
    };

    service.permissions = function (entityCrudId, successCallback) {
        if (!entityCrudId) {
            return;
        }
        $http.post("/rest/permissions", {entityCrudId: entityCrudId}).success(successCallback);
    };

    service.layout = function (entityTypeId, successCallback) {
        if (!entityTypeId) {
            return;
        }
        $http.get("/rest/layout/" + entityTypeId).success(successCallback);
    };

    service.findAll = function (entityCrudId, successCallback) {
        if (!entityCrudId) {
            return;
        }
        $http.post("/rest/crud/find", {entityCrudId: entityCrudId}).success(successCallback);
    };

    function trimFiltering(filtering) { //TODO should be trimmed in control
        if (!filtering) return filtering;
        filtering = angular.copy(filtering);
        filtering.textSearch = filtering.textSearch && filtering.textSearch.length > 0 ? filtering.textSearch : undefined;
        return filtering;
    }

    service.findRange = function (entityCrudId, filtering, start, count, successCallback) {
        if (!entityCrudId) {
            return;
        }
        $http.post("/rest/crud/find-range", {start: start, count: count, filtering: trimFiltering(filtering), entityCrudId: entityCrudId}).success(successCallback);
    };

    service.findCount = function (entityCrudId, filtering, successCallback) {
        if (!entityCrudId) {
            return;
        }
        $http.post("/rest/crud/find-count", {entityCrudId: entityCrudId, filtering: trimFiltering(filtering)}).success(successCallback);
    };

    service.createEntity = function (entityCrudId, entity, successCallback) {
        if (!entityCrudId) {
            return;
        }
        var promise = $http.post("/rest/crud/create", {entityCrudId: entityCrudId, entity: entity});
        if (successCallback) {
            promise.success(successCallback);
        }
        return promise.then(getJson);
    };

    service.readEntity = function (entityCrudId, entityId, successCallback) {
        if (!entityCrudId) {
            return;
        }
        $http.post("/rest/crud/read", {entityCrudId: entityCrudId, entityId: entityId}).success(successCallback);
    };

    service.updateEntity = function (entityCrudId, entity, successCallback) {
        if (!entityCrudId) {
            return;
        }
        var promise = $http.post("/rest/crud/update", {entityCrudId: castToEntityCrudId(entityCrudId), entity: entity});
        if (successCallback) {
            promise.success(successCallback);
        }
        return promise.then(getJson);
    };

    service.deleteEntity = function (entityCrudId, entityId, successCallback) {
        if (!entityCrudId) {
            return;
        }
        $http.post("/rest/crud/delete", {entityCrudId: entityCrudId, entityId: entityId}).success(successCallback);
    };

    service.menus = function () {
        return $http.get("/rest/menus").then(getJson);
    };

    service.actions = function (entityCrudId, actionTarget) {
        return $http.post('/rest/actions', {entityCrudId: entityCrudId, actionTarget: actionTarget}).then(getJson);
    };

    service.performAction = function (entityCrudId, actionId, selectedItemIds) {
        return $http.post('/rest/actions/perform', {entityCrudId: entityCrudId, actionId: actionId, selectedItemIds: selectedItemIds}).then(getJson);
    };

    function getJson(resp) {
        return resp.data;
    }

    service.referenceValueCache = {};

    service.referenceValues = function (entityTypeId, successCallback) {
        if (!entityTypeId) {
            return;
        }
        var promise;
        if (service.referenceValueCache[entityTypeId]) {
            promise = $q.when(service.referenceValueCache[entityTypeId]);
        }
        else {
            promise = $http.get("/rest/reference/values/" + entityTypeId).then(getJson).then(function (referenceValues) {
                service.referenceValueCache[entityTypeId] = [{id: undefined, name: ""}].concat(referenceValues);
                return service.referenceValueCache[entityTypeId];
            });
        }
        if (successCallback) {
            promise.then(successCallback);
        }
        return promise;
    };

    service.referenceValueByEntityId = function (entityTypeId, entityId) {
        return $http.get("/rest/reference/values/" + entityTypeId + "/by-id/" + entityId).then(getJson);
    };

    service.signUp = function (username, password) {
        return $http.post('/rest/sign-up', {username: username, password: password});
    };

    return service;
}]);

allcountModule.factory("messages", ["messagesObj", function (messagesObj) {
    return function (msg) {
        return messagesObj[msg] || msg;
    };
}]);

allcountModule.factory("fieldRenderingService", ["$filter", "$compile", "$locale", "rest", "messages", function ($filter, $compile, $locale, rest, messages) {
    var service = {};

    var fieldRenderers = {
        text: function (value) {
            return value;
        },
        date: function (value) {
            return $filter('date')(value);
        },
        integer: function (value) {
            return value;
        },
        money: function (value) {
            return renderCurrency(value);
        },
        checkbox: function (value) {
            return value ? messages("Yes") : messages("No");
        },
        reference: function (value) {
            return value ? value.name : undefined;
        },
        password: function (value) {
            return '';
        },
        relation: false,
        attachment: function (value) {
            if (!value) {
                return undefined;
            }
            var elem = $('<a></a>');
            elem.attr('href', '/rest/download/' + value.fileId);
            elem.text(value.name);
            return  elem;
        }
    };

    var dateRegex = /^(\d{4})-(\d\d)-(\d\d)$/;

    function parseDate(s) {
        if (!s) return undefined;
        var match;
        if (match = s.match(dateRegex)) {
            var date = new Date(0);
            date.setFullYear(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
            return date;
        }
        return undefined;
    }

    function textInput(controller, updateValue) {
        var input = $('<input type="text" class="form-control"/>'); //TODO remove form-control?
        input.val(controller.$viewValue);
        input.on('input', function () {
            var value = $.trim($(this).val());
            updateValue(value.length > 0 ? value : undefined);
        });
        return input;
    }

    var currencyConfig = { //TODO
        'alias': 'numeric',
        'radixPoint': $locale.NUMBER_FORMATS.DECIMAL_SEP,
        'groupSeparator': $locale.NUMBER_FORMATS.GROUP_SEP,
        'autoGroup': true,
        'digits': 2, //$locale.NUMBER_FORMATS.PATTERNS[1].maxFrac, //TODO could be other than 2?
        'digitsOptional': false,
        'placeholder': '0'
    };

    function renderCurrency(viewValue) {
        return viewValue && $.inputmask.format(viewValue.slice(0, viewValue.length - 2) + currencyConfig.radixPoint + viewValue.slice(viewValue.length - 2), currencyConfig) || undefined;
    }

    var fieldEditors = {
        text: function (fieldDescription, controller, updateValue, clone, scope) {
            return textInput(controller, updateValue);
        },
        password: function (fieldDescription, controller, updateValue, clone, scope) { //TODO doubling
            var input = $('<input type="password" class="form-control"/>'); //TODO remove form-control?
            input.val(controller.$viewValue);
            input.on('input', function () {
                var value = $.trim($(this).val());
                updateValue(value.length > 0 ? value : undefined);
            });
            return input;
        },
        money: function (fieldDescription, controller, updateValue, clone, scope) {
            var input = $('<input type="text" class="form-control"/>'); //TODO remove form-control?
            var viewValue = controller.$viewValue;
            viewValue = renderCurrency(viewValue);
            input.val(viewValue);
            input.on('input', function () {
                var value = $.trim($(this).val()).replace(/[^0-9]/g, '');
                updateValue(value.length > 0 ? value : undefined);
            });
            $(input).inputmask(currencyConfig);
            return input;
        },
        date: function (fieldDescription, controller, updateValue, clone, scope) { //TODO
            var input = $('<div class="input-group date"><input type="text" class="form-control"><span class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></span></div>');
            input.datepicker({
                autoclose: true,
                language: $locale.id.split("-")[0],
                format: $locale.DATETIME_FORMATS.shortDate
                    .replace("MMMM", "^^").replace("MMM", "^").replace("MM","mm").replace("M", "m").replace("^^", "MM").replace("^", "M")
                    .replace("EEE", "D").replace("EEEE", "DD")
            });
            input.datepicker('update', parseDate(controller.$viewValue));
            input.datepicker().on('changeDate', function (e) {
                updateValue(e.date ? $filter('date')(e.date, 'yyyy-MM-dd') : undefined);
            });
            input.datepicker().on('clearDate', function (e) {
                updateValue(undefined);
            });
            return input;
        },
        reference: function (fieldDescription, controller, updateValue, clone, scope) {
            if (fieldDescription.fieldType.render === 'fixed') {
                rest.referenceValues(fieldDescription.fieldType.referenceEntityTypeId, function (referenceValues) {
                    scope.referenceValues = referenceValues;
                    scope.referenceIdToValue = {};
                    $(scope.referenceValues).each(function (index, item) {
                        scope.referenceIdToValue[item.id] = item;
                    });
                    scope.$watch('selectedReferenceId', function (referenceValueId) {
                        controller.$setViewValue(referenceValueId ? scope.referenceIdToValue[referenceValueId] : undefined);
                    });
                });
                scope.selectedReferenceId = controller.$viewValue ? controller.$viewValue.id : undefined;
                return $compile('<select ng-model="selectedReferenceId" ng-options="r.id as r.name for r in referenceValues" class="form-control"></select>')(scope);
            } else {
                scope.referenceEntityTypeId = fieldDescription.fieldType.referenceEntityTypeId;

                scope.$watch('selectedReference.value', function (referenceValue) {
                    controller.$setViewValue(referenceValue);
                });
                scope.selectedReference = {value: controller.$viewValue};

                return $compile('<div ng-model="selectedReference.value" lc-reference="referenceEntityTypeId"></div>')(scope);

            }
        },
        integer: function (fieldDescription, controller, updateValue, clone, scope) {
            scope.integerValue = controller.$viewValue + "";
            scope.pattern = /\d+/;
            scope.$watch('integerValue', function (integerValue) {
                controller.$setViewValue(integerValue && parseInt(integerValue, 10) || undefined);
            });
            return $compile('<input ng-model="integerValue" class="form-control" ng-pattern="pattern">')(scope);
        },
        checkbox: function (fieldDescription, controller, updateValue, clone, scope) {
            scope.checkboxValue = controller.$viewValue;
            scope.$watch('checkboxValue', function (checkboxValue) {
                controller.$setViewValue(checkboxValue);
            });
            return $compile('<div class="checkbox"><label><input type="checkbox" ng-model="checkboxValue"></label></div>')(scope);
        },
        relation: function (fieldDescription, controller, updateValue, clone, scope) {
            scope.$parent.$watch('entity', function (entity) {
                scope.entityCrudId = entity.id ? {
                    entityTypeId: scope.entityTypeId,
                    relationField: fieldDescription.field,
                    parentEntityId: entity.id
                } : undefined;
            });

            return $compile('<div ng-show="entityCrudId" a-grid="entityCrudId" paging="{start: 0, count: 10}" edit-mode="isEditor"></div><div ng-show="!entityCrudId">' + messages('Relation editing available after object creation') + '</div>')(scope); //TODO paging
        },
        attachment: function (fieldDescription, controller, updateValue, clone, scope) {
            scope.fieldValue = controller.$viewValue;
            scope.$watch('fieldValue', function (value) {
                controller.$setViewValue(value);
            });
            return $compile('<div lc-upload="fieldValue"></div>')(scope);
        }
    };

    service.readOnlyFieldRenderer = function (fieldDescription) {
        return fieldRenderers[fieldDescription.fieldTypeId];
    };

    service.fieldEditor = function (fieldDescription, controller, updateValue, clone, scope) {
        return fieldEditors[fieldDescription.fieldTypeId](fieldDescription, controller, updateValue, clone, scope);
    };

    var layoutRenderers = {
        H: function (params, children) {
            var container = $('<div class="row"/>');
            var fraction = Math.floor(12.0 / children.length);
            $(children).each(function (index, item) {
                var elem = $('<div class="col-md-' + fraction +  '"/>');
                elem.append(item());
                container.append(elem);
            });
            return container;
        },
        V: function (params, children) {
            var container = $('<div class="row"/>');
            $(children).each(function (index, item) {
                var elem = $('<div class="col-md-12"/>');
                elem.append(item());
                container.append(elem);
            });
            return container;
        },
        Tabs: function (params, children, childrenObjs) {
            var container = $('<div/>');
            var tabContainer = $('<ul class="nav nav-tabs"/>');
            $(childrenObjs).each(function (index, item) {
                var elem = $('<li class="' + (index == 0 ? 'active' : '') +'"><a href="#tab-' + index +  '" data-toggle="tab">' + item.params.title + '</a></li>'); //TODO javascript injection? //TODO id generation
                tabContainer.append(elem);
            });
            container.append(tabContainer);

            var paneContainer = $('<div class="tab-content"/>');
            $(children).each(function (index, item) {
                var elem = $('<div class="tab-pane ' + (index == 0 ? 'active' : '') +'" id="tab-' + index +  '"></div>'); //TODO javascript injection? //TODO id generation
                elem.append(item());
                paneContainer.append(elem);
            });
            container.append(paneContainer);
            return container;
        }
    };

    service.layoutRenderer = function (containerId, params, children, childrenObjs) {
        return layoutRenderers[containerId](params, children, childrenObjs);
    };

    return service;
}]);

function uploadDirective(directiveName) {
    return ["rest", "fieldRenderingService", "$parse", "messages", function (rest, fieldRenderingService, $parse, messages) {
        return {
            restrict: 'A',
            templateUrl: '/assets/template/upload.html',
            scope: true,
            link: function (scope, element, attrs) {
                var fieldValueGetter = $parse(attrs[directiveName]);
                scope.options = {
                    url: '/rest/upload',
                    autoUpload: true,
                    handleResponse: function (e, data) {
                        var files = data.result && data.result.files;
                        if (files) {
                            fieldValueGetter.assign(scope.$parent, files[0]);
                            data.scope.replace(data.files, files);
                        } else if (data.errorThrown ||
                            data.textStatus === 'error') {
                            data.files[0].error = data.errorThrown || data.textStatus;
                        }
                    }
                };

                scope.isNoFile = function (queue) {
                    return !fieldValueGetter(scope.$parent) && queue.length === 0;
                };

                scope.fileName = function (queue) {
                    return fieldValueGetter(scope.$parent) && fieldValueGetter(scope.$parent).name || queue.length > 0 && queue[queue.length - 1].name || undefined;
                };

                scope.isUploading = function (queue) {
                    return queue.length > 0 && queue[queue.length - 1].$state && queue[queue.length - 1].$state() === 'pending';
                };

                scope.hasFile = function () {
                    return !!fieldValueGetter(scope.$parent);
                };

                scope.removeFile = function () {
                    if (!scope.hasFile()) {
                        return;
                    }
                    //TODO REST remove unused file call
                    fieldValueGetter.assign(scope.$parent, undefined);
                }
            }
        }
    }];
}
allcountModule.directive("aUpload", uploadDirective("aUpload")); //TODO deprecated
allcountModule.directive("lcUpload", uploadDirective("lcUpload"));

function fieldDirective(directiveName) {
    return ["rest", "fieldRenderingService", "$compile", function (rest, fieldRenderingService, $compile) {
        return {
            restrict: 'A',
            require: 'ngModel',
            scope: false,
            transclude: 'element',
            link: function (scope, element, attrs, controller, transclude) {
                var fieldElement, fieldScope;

                function setFieldElement(elem) {
                    if (fieldElement) {
                        fieldElement.remove();
                        fieldElement = undefined;
                    }
                    if (elem) {
                        elem = $(elem);
                        element.after(elem);
                        fieldElement = elem;
                    }
                }

                function updateValue(value) {
                    scope.$apply(function () {
                        controller.$setViewValue(value);
                    })
                }

                function renderField(fieldDescription, isEditor) {
                    isEditor = fieldDescription.isReadOnly ? false : isEditor;
                    if (!fieldDescription || fieldRenderingService.readOnlyFieldRenderer(fieldDescription) === false && fieldScope) {
                        if (fieldScope) {
                            fieldScope.isEditor = isEditor;
                        }
                        return;
                    }
                    if (fieldScope) fieldScope.$destroy();
                    if (!fieldDescription) return;
                    fieldScope = scope.$new();
                    if (isEditor || fieldRenderingService.readOnlyFieldRenderer(fieldDescription) === false) {
                        fieldScope.isEditor = isEditor;
                        controller.$render = function () {
                            transclude(scope, function (clone) { //TODO what scope for transclude?
                                setFieldElement(fieldRenderingService.fieldEditor(fieldDescription, controller, updateValue, clone, fieldScope));
                            });
                        };
                    } else {
                        controller.$render = function () {
                            var value = fieldRenderingService.readOnlyFieldRenderer(fieldDescription)(controller.$viewValue);

                            var elem;
                            if (value instanceof jQuery) {
                                elem = $compile('<div class="form-control-static"></div>')(fieldScope);
                                elem.append(value);
                            } else {
                                fieldScope.renderedText = value || '';
                                elem = $compile('<div class="form-control-static">{{renderedText}}</div>')(fieldScope);
                            }
                            setFieldElement(elem);
                        }
                    }
                    controller.$render();
                }

                scope.$watch(attrs.isEditor, function (isEditor) {
                    renderField(scope.$eval(attrs[directiveName]), isEditor);
                });
                scope.$watch(attrs[directiveName], function (fd) {
                    renderField(fd, scope.$eval(attrs.isEditor));
                })
            }
        }
    }];
}
allcountModule.directive("aField", fieldDirective("aField")); //TODO deprecated
allcountModule.directive("lcField", fieldDirective("lcField"));

function layoutDirective(directiveName) {
    return ["rest", "fieldRenderingService", function (rest, fieldRenderingService) {
        return {
            restrict: 'A',
            scope: false,
            priority: 1000,
            transclude: 'element',
            link: function (scope, element, attrs, controller, transclude) {
                var currentLayout, childScopes = [];

                function allocateScope(field) {
                    var childScope = scope.$new();
                    childScope[attrs.field] = field;
                    childScopes.push(childScope);
                    return childScope;
                }

                function renderChild(layoutElem) {
                    var containerId = layoutElem.containerId;
                    if (containerId == 'field') {
                        return transclude(allocateScope(layoutElem.params.field), function (clone) { //TODO: compact field format
                            return clone;
                        });
                    }
                    return fieldRenderingService.layoutRenderer(
                        containerId,
                        layoutElem.params,
                        $(layoutElem.children).map(function (index, item) {
                            return function () {
                                return renderChild(item);
                            }
                        }),
                        layoutElem.children
                    );
                }

                scope.$watch(attrs[directiveName], function (entityTypeId) {
                    rest.layout(entityTypeId, function (layout) {
                        $(childScopes).each(function (index, item) {
                            item.$destroy();
                        });
                        childScopes = [];
                        if (currentLayout) {
                            currentLayout.remove();
                        }
                        currentLayout = renderChild(layout);
                        element.after(currentLayout);
                    })
                })
            }
        }
    }];
}

allcountModule.directive("aLayout", layoutDirective("aLayout")); //TODO deprecated
allcountModule.directive("lcLayout", layoutDirective("lcLayout"));

function handleValidationErrorsCallback(scope) {
    return function onError(err) {
        if (err.status === 403) {
            scope.validationErrors = err.data;
        } else {
            throw err;
        }
    }
}

function listDirective(directiveName, templateUrl) {
    return ["rest", "fieldRenderingService", "$parse", "messages", function (rest, fieldRenderingService, $parse, messages) {
        return {
            restrict: 'A',
            priority: 1100,
            templateUrl: templateUrl,
            scope: true,
            link: function (scope, element, attrs, ctrl) {
                scope.messages = messages;
                scope.atomicCounter = 0;
                scope.filtering = {};
                if (attrs.publishMethods) {
                    var publishMethodsTo = $parse(attrs.publishMethods);
                    publishMethodsTo.assign(scope.$parent, {
                        updateGrid: function () { if (scope.updateGrid) scope.updateGrid() },
                        hasWritePermission: function () { return scope.permissions && scope.permissions.write }
                    })
                }

                scope.$parent.$watch(attrs.paging, function (paging) {
                    scope.paging = paging;
                    if (scope.updateGrid) scope.updateGrid();
                }, true);

                scope.$parent.$watch(attrs.totalRow, function (totalRow) { //TODO doubling
                    scope.totalRow = totalRow;
                }, true);

                scope.$parent.$watch(attrs.filtering, function (filtering) {
                    scope.filtering = filtering;
                    if (scope.updateGrid) scope.updateGrid();
                }, true);

                scope.$parent.$watch(attrs[directiveName], function (entityTypeId) {
                    if (typeof entityTypeId == "string")
                        scope.entityCrudId = {entityTypeId: entityTypeId};
                    else
                        scope.entityCrudId = entityTypeId;
                    rest.getFieldDescriptions(scope.entityCrudId, true, function (descriptions) {
                        scope.fieldDescriptions = descriptions;
                        scope.fieldRenderer = {};
                        $(descriptions).each(function (index, desc) {
                            scope.fieldRenderer[desc.field] = fieldRenderingService.readOnlyFieldRenderer(desc);
                        })
                    });

                    rest.permissions(scope.entityCrudId, function (permissions) {
                        scope.permissions = permissions;
                    });

                    scope.updateGrid = function () {
                        if (!scope.paging) return;
                        var next = ++scope.atomicCounter;
                        setTimeout(function () {
                            if (next !== scope.atomicCounter) {
                                return;
                            }
                            if (scope.paging.count === 0) {
                                scope.items = [];
                            } else {
                                rest.findRange(scope.entityCrudId , scope.filtering, scope.paging.start, scope.paging.count, function (items) {
                                    scope.items = items
                                })
                            }
                        }, 200);
                    };

                    scope.deleteEntity = function (entity) {
                        function removeEntity() {
                            scope.items.splice(scope.items.indexOf(entity), 1);
                            if (scope.editingItem == entity) {
                                scope.editingItem = undefined;
                            }
                        }
                        if (entity.id) {
                            rest.deleteEntity(scope.entityCrudId, entity.id, removeEntity);
                        } else {
                            removeEntity();
                        }
                    };

                    scope.editEntity = function (entity) {
                        scope.validationErrors = undefined;
                        if (scope.editingItem) {
                            scope.saveEntity(function () {});
                        }

                        scope.originalEntity = angular.copy(entity);
                        scope.editingItem = entity;
                    };

                    scope.navigate = function (entityId) {
                        if (attrs.navigate) {
                            scope.$parent.$eval(attrs.navigate, {$entityId: entityId});
                        }
                    };

                    scope.headerClass = function (fd) {
                        var cls = {};
                        cls[fd.fieldTypeId + '-grid-header'] = true;
                        return cls;
                    };

                    scope.saveEntity = function (success) {
                        var entity = scope.editingItem;
                        function onSuccess(id) {
                            scope.validationErrors = undefined;
                            if (!entity.id) {
                                entity.id = id;
                            }
                            if (success) {
                                success();
                            } else {
                                scope.editingItem = undefined;
                            }
                        }
                        if (scope.editingItem.id) {
                            rest.updateEntity(scope.entityCrudId, scope.entityForUpdate()).then(onSuccess, handleValidationErrorsCallback(scope));
                        } else {
                            rest.createEntity(scope.entityCrudId, entity).then(onSuccess, handleValidationErrorsCallback(scope));
                        }
                    };

                    scope.createEntity = function () {
                        var item = {};
                        scope.items.push(item);
                        scope.editEntity(item);
                    };

                    scope.entityForUpdate = function () { //TODO doubling
                        var forUpdate = {id: scope.editingItem.id};
                        for (var field in scope.editingItem) {
                            if (scope.editingItem.hasOwnProperty(field) && scope.isFieldChanged(field)) {
                                forUpdate[field] = scope.editingItem[field] ? scope.editingItem[field] : null;
                            }
                        }
                        return forUpdate;
                    };

                    scope.isFieldChanged = function (field) { //TODO doubling
                        return scope.editingItem && scope.originalEntity && !angular.equals(scope.editingItem[field], scope.originalEntity[field])
                    };

                    scope.updateGrid();
                });

                if (attrs.editMode)
                    scope.$parent.$watch(attrs.editMode, function (value) {
                        scope.isInEditMode = value && scope.permissions && scope.permissions.write;
                        if (!scope.isInEditMode) {
                            scope.editEntity(undefined);
                        }
                    })
            }
        }
    }]
}

allcountModule.directive("aGrid", listDirective('aGrid', '/assets/template/grid.html')); //TODO deprecated
allcountModule.directive("lcGrid", listDirective('lcGrid', '/assets/template/grid.html'));
allcountModule.directive("lcList", listDirective('lcList'));

function pagingDirective(directiveName) {
    return ["rest", "$parse", function (rest, $parse) {
        return {
            restrict: 'A',
            templateUrl: '/assets/template/paging.html',
            scope: true,
            link: function (scope, element, attrs) {
                if (attrs.publishMethods) {
                    var publishMethodsTo = $parse(attrs.publishMethods);
                    publishMethodsTo.assign(scope.$parent, {
                        refresh: function () {
                            scope.refresh()
                        }
                    })
                }

                scope.$parent.$watch(attrs.filtering, function (filtering) {
                    scope.filtering = filtering;
                    if (scope.reload) scope.reload();
                }, true);

                scope.$parent.$watch(attrs[directiveName], function (entityTypeId) {
                    scope.filtering = {};
                    scope.pageSize = 50;
                    scope.numPages = 10;
                    var pagingAssign;
                    if (attrs.paging) pagingAssign = $parse(attrs.paging).assign;

                    scope.refreshCount = function (onSuccess) {
                        rest.findCount({entityTypeId: entityTypeId}, scope.filtering, function (countAndTotalRow) {
                            scope.count = countAndTotalRow.count;
                            var setTotalRow = attrs.totalRow && $parse(attrs.totalRow).assign;
                            if (setTotalRow) {
                                setTotalRow(scope.$parent, countAndTotalRow.totalRow);
                            }
                            onSuccess();
                        });
                    };

                    scope.refresh = function () {
                        scope.refreshCount(function () {
                            var start = Math.max(0, Math.min(scope.currentPaging.start, scope.count - 1));
                            scope.currentPaging = {
                                start: start,
                                count: Math.min(scope.pageSize, scope.count - start)
                            };
                        })
                    };

                    scope.reload = function () {
                        scope.refreshCount(function () {
                            scope.currentPaging = {
                                start: 0,
                                count: Math.min(scope.pageSize, scope.count)
                            };
                        });
                    };

                    scope.reload();

                    scope.updatePaging = function (paging) {
                        scope.pages = [];
                        for (
                            var i = Math.max(paging.start - scope.numPages * scope.pageSize, 0);
                            i < Math.min(paging.start + scope.numPages * scope.pageSize, scope.count);
                            i += scope.pageSize
                        ) {
                            scope.pages.push({start: i, count: Math.min(scope.count - i, scope.pageSize)});
                        }
                    };

                    scope.nextPage = function () {
                        var nextStart = Math.min(scope.currentPaging.start + scope.pageSize, scope.count);
                        scope.currentPaging = {
                            start: nextStart,
                            count: Math.min(scope.count - nextStart, scope.pageSize)
                        }
                    };

                    scope.hasNextPage = function () {
                        return scope.currentPaging && scope.currentPaging.start + scope.pageSize < scope.count;
                    };

                    scope.prevPage = function () {
                        var nextStart = Math.max(scope.currentPaging.start - scope.pageSize, 0);
                        scope.currentPaging = {
                            start: nextStart,
                            count: Math.min(scope.count - nextStart, scope.pageSize)
                        }
                    };

                    scope.hasPrevPage = function () {
                        return scope.currentPaging && scope.currentPaging.start - scope.pageSize >= 0;
                    };

                    scope.setCurrentPage = function (page) {
                        scope.currentPaging = page;
                    };

                    scope.$watch('currentPaging', function (paging) {
                        if (pagingAssign) pagingAssign(scope.$parent, paging);
                        if (paging)
                            scope.updatePaging(paging);
                    }, true);
                });
            }
        }
    }];
}
allcountModule.directive("aPaging", pagingDirective("aPaging")); //TODO deprecated
allcountModule.directive("lcPaging", pagingDirective("lcPaging"));

allcountModule.directive("lcForm", ["rest", "fieldRenderingService", "$parse", function (rest, fieldRenderingService, $parse) {
    return {
        restrict: 'A',
        scope: true,
        link: function (scope, element, attrs) {
            scope.entity = {}; //TODO should be filled by entity or template
            scope.$watch(attrs.lcForm, function (entityTypeId) {
                if (typeof entityTypeId == "string") {
                    scope.entityCrudId = {entityTypeId: entityTypeId};
                    scope.entityTypeId = entityTypeId;
                } else {
                    scope.entityCrudId = entityTypeId;
                }
                scope.reloadEntity = function (successCallback) {
                    scope.entity = {}; //TODO should be filled by entity or template
                    var entityId = scope.$parent.$eval(attrs.entityId);
                    if (!entityId) return;
                    rest.readEntity(scope.entityCrudId, entityId, function (entity) {
                        scope.entity = entity;
                        scope.originalEntity = angular.copy(entity);
                        if (successCallback) successCallback();
                    })
                };

                scope.$watch('entity', function (entity, oldEntity) {
                    for (var field in scope.fieldToDesc) {
                        if (scope.fieldToDesc.hasOwnProperty(field) && entity && oldEntity &&
                            !angular.equals(entity[field], oldEntity[field]) && scope.validationErrors) {
                            scope.validationErrors[field] = undefined;
                        }
                    }
                }, true);

                scope.createEntity = function (successCallback) {
                    return rest.createEntity(scope.entityCrudId, scope.entity).then(function () {
                        scope.validationErrors = undefined;
                        successCallback && successCallback();
                    }, handleValidationErrorsCallback(scope))
                };

                scope.updateEntity = function (successCallback) {
                    return rest.updateEntity(scope.entityCrudId, scope.entityForUpdate()).then(function () { //TODO send only difference with original entity
                        scope.validationErrors = undefined;
                        if (successCallback) successCallback();
                    }, handleValidationErrorsCallback(scope))
                };

                scope.entityForUpdate = function () {
                    var forUpdate = {id: scope.entity.id};
                    for (var field in scope.entity) {
                        if (scope.entity.hasOwnProperty(field) && scope.isFieldChanged(field)) {
                            forUpdate[field] = scope.entity[field] ? scope.entity[field] : null;
                        }
                    }
                    return forUpdate;
                };

                scope.isFieldChanged = function (field) {
                    return scope.entity && scope.originalEntity && !angular.equals(scope.entity[field], scope.originalEntity[field])
                };

                if (attrs.publishMethods) {
                    var publishMethodsTo = $parse(attrs.publishMethods);
                    publishMethodsTo.assign(scope.$parent, {
                        createEntity: scope.createEntity,
                        updateEntity: scope.updateEntity,
                        reloadEntity: scope.reloadEntity
                    })
                }

                rest.getFieldDescriptions(scope.entityCrudId, false, function (descriptions) { //TODO doubling
                    scope.fieldDescriptions = descriptions;
                    scope.fieldRenderer = {};
                    scope.fieldToDesc = {};
                    $(descriptions).each(function (index, desc) {
                        scope.fieldRenderer[desc.field] = fieldRenderingService.readOnlyFieldRenderer(desc);
                        scope.fieldToDesc[desc.field] = desc;
                    })
                });

                scope.showLabel = function (field) {
                    return scope.fieldToDesc && scope.fieldToDesc[field] && !scope.fieldToDesc[field].fieldType.removeFormLabel;
                };

                scope.reloadEntity();
            });

            attrs.isEditor && scope.$parent.$watch(attrs.isEditor, function (isEditor) {
                scope.isEditor = isEditor;
            });

            if (attrs.entityId)
                scope.$parent.$watch(attrs.entityId, function (newEntityId) {
                    if (scope.reloadEntity) scope.reloadEntity();
                });
        }
    }
}]);

allcountModule.directive("lcFormDefault", [function () {
    return {
        restrict: 'C',
        scope: false,
        templateUrl: '/assets/template/form-default.html',
        transclude: false
    }
}]);

allcountModule.directive("lcFormCreate", [function () {
    return {
        restrict: 'C',
        scope: false,
        templateUrl: '/assets/template/form-create.html',
        transclude: false
    }
}]);

function messageDirective(directiveName) {
    return ["messages", function (messages) {
        return {
            restrict: 'A',
            scope: false,
            link: function (scope, element, attrs) {
                attrs.$observe(directiveName, function (messageValue) {
                    $(element).text(messages(messageValue));
                });
            }
        }
    }];
}
allcountModule.directive("aMessage", messageDirective("aMessage")); //TODO deprecated
allcountModule.directive("lcMessage", messageDirective("lcMessage"));

function menuDirective() {
    return ["rest", function (rest) {
        return {
            restrict: 'C',
            scope: true,
            link: function (scope, element, attrs) {
                rest.menus().then(function (menuItems) {
                    scope.menuItems = menuItems;
                });

                scope.onlyFirstLevel = function () {
                    if (scope.menuItems) {
                        var onlyFirstLevel = true;
                        $(scope.menuItems).each(function (index, item) {
                            if (item.children && item.children.length > 0) {
                                onlyFirstLevel = false;
                            }
                        });
                        return onlyFirstLevel;
                    }
                    return false;
                }
            }
        }
    }];
}
allcountModule.directive("aMenu", menuDirective()); //TODO deprecated
allcountModule.directive("lcMenu", menuDirective());

allcountModule.directive("lcActions", ["rest", "$location", "messages", function (rest, $location, messages) {
    return {
        restrict: 'A',
        scope: true,
        priority: 1100,
        link: function (scope, element, attrs) {
            scope.$parent.$watch(attrs.lcActions, function (entityTypeOrCrudId) {
                scope.entityCrudId = toEntityCrudId(entityTypeOrCrudId);
                refresh();
            });

            scope.$parent.$watch(attrs.actionTarget, function (actionTarget) {
                scope.actionTarget = actionTarget;
                refresh();
            });

            scope.selectedItems = [];
            attrs.selectedItems && scope.$parent.$watch(attrs.selectedItems, function (selectedItems) {
                scope.selectedItems = selectedItems;
                refresh();
            }, true);

            refresh();

            function refresh() {
                if (!scope.entityCrudId || !scope.actionTarget) {
                    scope.actions = [];
                } else {
                    var entityCrudId = scope.entityCrudId;
                    rest.actions(scope.entityCrudId, scope.actionTarget).then(function (actions) {
                        scope.actions = _.map(actions, function (action) {
                            action.perform = function () {
                                rest.performAction(entityCrudId, action.id, scope.selectedItems).then(function (actionResult) {
                                    if (actionResult.type === 'redirect') {
                                        window.location = actionResult.url;
                                    } else if (actionResult.type === 'refresh') {
                                        if (attrs.onRefresh) {
                                            scope.$eval(attrs.onRefresh);
                                        } else {
                                            throw new Error('on-refresh is not defined for lc-actions');
                                        }
                                    } else {
                                        throw new Error('Unknown actionResult type "' + actionResult.type +  '" for ' + JSON.stringify(actionResult));
                                    }
                                });
                            };
                            action.name = messages(action.name);
                            return action;
                        });
                    });
                }
            }
        }
    }
}]);

allcountModule.directive("lcReference", ["rest", "$location", "messages", function (rest, $location, messages) {
    return {
        restrict: 'A',
        templateUrl: '/assets/template/reference.html',
        scope: true,
        require: 'ngModel',
        link: function (scope, element, attrs, controller) {
            scope.referenceViewState = {};

            scope.$parent.$watch(attrs.lcReference, function (entityTypeId) {
                if (!entityTypeId) {
                    return;
                }
                scope.entityTypeId = entityTypeId;
                var bloodhound = new Bloodhound({
                    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    prefetch: "/rest/reference/values/" + entityTypeId + '/top',
                    remote: "/rest/reference/values/" + entityTypeId + '/queries/%QUERY'
                });

                bloodhound.initialize();

                var elem = $('.typeahead', element);

                elem.typeahead(null, {
                    name: 'reference',
                    displayKey: 'name',
                    source: bloodhound.ttAdapter()
                });

                function onChange(event, referenceValue) {
                    scope.$apply(function () {
                        controller.$setViewValue(referenceValue);
                    })
                }
                elem.on('typeahead:selected', onChange);
                elem.on('typeahead:autocompleted', onChange);

                controller.$render = function () {
                    elem.typeahead('val', controller.$viewValue && controller.$viewValue.name || '');
                };

                controller.$render();

                function setValue(value) {
                    controller.$setViewValue(value);
                    controller.$render();
                }

                scope.clear = function () {
                    setValue(undefined);
                };

                scope.referenceViewState.onCreate = function () {
                    scope.referenceViewState.editForm.createEntity(function (entityId) { //TODO
                        rest.referenceValueByEntityId(entityTypeId, entityId).then(function (referenceValue) {
                            setValue(referenceValue);
                        });
                        scope.isCreateModalShowing = false;
                    })
                };

                scope.createNewReferenceItem = function () {
                    scope.isCreateModalShowing = true;
                }
            });
        }
    }
}]);

allcountModule.directive("lcModal", ["$parse", function ($parse) {
    return {
        restrict: 'A',
        scope: true,
        transclude: 'element',
        link: function (scope, element, attrs, ctrl, transclude) {
            transclude(scope, function (elem) {
                var $element = $(elem);
                var modal = $element.modal({show: false});
                scope.show = false;

                var assignIsShowing = $parse(attrs.lcModal).assign;
                scope.$parent.$watch(attrs.lcModal, function (show) {
                    if (scope.show !== !!show) {
                        scope.show = !!show;
                        if (scope.show) {
                            modal.modal('show');
                        } else {
                            modal.modal('hide');
                        }
                    }
                });

                function fireIsShowing(isShowing) {
                    scope.show = isShowing;
                    assignIsShowing(scope.$parent, isShowing);
                }
                modal.on('show.bs.modal', function () { fireIsShowing(true) });
                modal.on('hide.bs.modal', function () { fireIsShowing(false) });
            })
        }
    }
}]);

allcountModule.directive("lcTooltip", ["$parse", "messages", function ($parse, messages) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            $(element).tooltip({
                placement: 'bottom',
                title: messages(attrs.lcTooltip)
            });
        }
    }
}]);


function toEntityCrudId(id) {
    if (angular.isString(id)) {
        return {entityTypeId: id};
    } else {
        return id;
    }
}