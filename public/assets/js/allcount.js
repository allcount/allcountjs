var allcountModule = angular.module("allcount", ['ngAnimate', 'blueimp.fileupload', 'ui.bootstrap', 'allcount-base']);

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

allcountModule.config(["$locationProvider", function ($locationProvider) {
    $locationProvider.html5Mode({enabled: true, requireBase: true});
}]);

/**
 * Deprecated
 */
allcountModule.factory("rest", ["lcApi", function (lcApi) {
    return lcApi;
}]);

allcountModule.config(["fieldRenderingServiceProvider", function (fieldRenderingServiceProvider) {
    fieldRenderingServiceProvider.defineFields(["$filter", "$compile", "$locale", "lcApi", "messages", function ($filter, $compile, $locale, rest, messages) {

        var dateRegex = /^(\d{4})-(\d\d)-(\d\d)$/;

        function textareaRenderer(value) {
            var elem = $('<p></p>');
            var escapedText = elem.text(value).html();
            elem.addClass("textarea-field-paragraph");
            const escapedHtml = escapedText.split("\n").join('<br>');
            elem.html(escapedHtml);
            return elem;
        }

        function parseDate(s) {
            return s && moment(s, 'YYYY-MM-DD HH:mm:ss').toDate();
        }

        function wireTextInputWithController(input, controller, updateValue) {
            input.val(controller.$viewValue);
            input.on('input', function () {
                var value = $.trim($(this).val());
                updateValue(value.length > 0 ? value : undefined);
            });
            return input;
        }

        function textInput(controller, updateValue) {
            var input = $('<input type="text" class="form-control"/>'); //TODO remove form-control?
            return wireTextInputWithController(input, controller, updateValue);
        }

        function textareaInput(controller, updateValue) {
            var input = $('<textarea class="form-control"/>'); //TODO remove form-control?
            return wireTextInputWithController(input, controller, updateValue);
        }

        function maskedInput(controller, updateValue, mask) {
            var input = $('<input type="text" class="form-control"/>'); //TODO remove form-control?
            $(input).inputmask(mask);
            input.val(controller.$viewValue);
            function listener() {
                var value = $.trim($(this).val());
                updateValue(value.length > 0 && $(input).inputmask("isComplete") ? value : undefined);
            }
            input.on('input', listener);
            input.on('cleared', listener);
            input.change(listener); //TODO triggers on blur but not always before save
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

        var referenceRenderer = function (value, fieldDescription) {
            if (value) {
                var link = $('<a></a>');
                link.attr('href', '/entity/' + fieldDescription.fieldType.referenceEntityTypeId + '/' + value.id); //TODO base href
                link.text(value.name);
                return link;
            }
            return undefined;
        };

        var dateFormat = function (fieldDescription) {
            return fieldDescription.fieldType.hasTime ? $locale.DATETIME_FORMATS.short : $locale.DATETIME_FORMATS.shortDate;
        };

        var toMomentDateFormat = function (angularDateFormat) {
            return angularDateFormat.replace("yyyy", "YYYY").replace("yy", "YY").replace("y", "YYYY").replace("dd","DD").replace("d", "D")
                .replace('EEEE', 'dddd').replace('EEE', 'ddd')
                .replace('ww', 'WW').replace('w', 'W')
                .replace('sss', 'SSS');
        };

        return {
            text: [function (value, fieldDescription) {
                return fieldDescription.fieldType.isMultiline ? textareaRenderer(value) : value;
            }, function (fieldDescription, controller, updateValue, clone, scope) {
                if (fieldDescription.fieldType.isMultiline) {
                    return textareaInput(controller, updateValue);
                } else if (fieldDescription.fieldType.mask) {
                    return maskedInput(controller, updateValue, fieldDescription.fieldType.mask);
                } else {
                    return textInput(controller, updateValue)
                }
            }],
            radio: [function (value, fieldDescription) {
                return value;
            }, function (fieldDescription, controller, updateValue, clone, scope) {
                scope.radioValue = controller.$viewValue;
                scope.$watch('radioValue', function (radioValue) {
                    controller.$setViewValue(radioValue);
                });
                var radioInputs = fieldDescription.fieldType.valuesArray.map(function (value) {
                   return '<input type="radio" ng-model="radioValue" value="{0}">{0}<br/>'.replace(/\{0\}/g, value); 
                }).join("\n");
                return $compile(radioInputs)(scope);
            }],            
            date: [function (value, fieldDescription) {
                return $filter('date')(parseDate(value), dateFormat(fieldDescription));
            }, function (fieldDescription, controller, updateValue, clone, scope) { //TODO
                var input = $('<div class="input-group date"><input type="text" class="form-control"><span class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></span></div>');
                input.datetimepicker({
                    locale: $locale.id.split("-")[0],
                    format: toMomentDateFormat(dateFormat(fieldDescription))
                });
                input.data("DateTimePicker").date(parseDate(controller.$viewValue) || null);
                input.on('dp.change', function (e) {
                    updateValue(e.date ? e.date.format('YYYY-MM-DD HH:mm:ss') : undefined);
                });
                $('input', input).focus(function () {
                    input.data("DateTimePicker").show();
                });
                return input;
            }],
            integer: [function (value) {
                return !isNaN(value) && value.toString() || "";
            }, function (fieldDescription, controller, updateValue, clone, scope) {
                scope.integerValue = controller.$viewValue;
                scope.pattern = /\d+/;
                scope.$watch('integerValue', function (integerValue) {
                    var x = integerValue && parseInt(integerValue, 10)
                    controller.$setViewValue(isNaN(x) ?  undefined : x);
                });
                return $compile('<input ng-model="integerValue" class="form-control" ng-pattern="pattern">')(scope);
            }],
            number: [function (value) {
                return !isNaN(value) && value.toString() || "";
            }, function (fieldDescription, controller, updateValue, clone, scope) {
                scope.numberValue = controller.$viewValue;
                scope.pattern = /[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/;
                scope.$watch('numberValue', function (numberValue) {
                    var x = numberValue && parseFloat(numberValue)
                    controller.$setViewValue(isNaN(x) ?  undefined : x);
                });
                return $compile('<input ng-model="numberValue" class="form-control" ng-pattern="pattern">')(scope);
            }],
            money: [function (value) {
                return renderCurrency(value);
            }, function (fieldDescription, controller, updateValue, clone, scope) {
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
            }],
            checkbox: [function (value) {
                return value ? messages("Yes") : messages("No");
            }, function (fieldDescription, controller, updateValue, clone, scope) {
                scope.checkboxValue = controller.$viewValue;
                scope.$watch('checkboxValue', function (checkboxValue) {
                    controller.$setViewValue(checkboxValue);
                });
                return $compile('<div class="checkbox"><label><input type="checkbox" ng-model="checkboxValue"></label></div>')(scope);
            }],
            reference: [referenceRenderer, function (fieldDescription, controller, updateValue, clone, scope) {
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
            }],
            multiReference: [function (value, fieldDescription) {
                if (value) {
                    var container = $('<div></div>');
                    value.forEach(function (i) {
                        var wrapper = $('<div></div>');
                        wrapper.append(referenceRenderer(i, fieldDescription));
                        container.append(wrapper);
                    });
                    return container;
                }
                return undefined;
            }, function (fieldDescription, controller, updateValue, clone, scope) {
                scope.referenceEntityTypeId = fieldDescription.fieldType.referenceEntityTypeId;

                scope.$watch('selectedReference.value', function (referenceValue) {
                    controller.$setViewValue(referenceValue);
                });
                scope.selectedReference = {value: controller.$viewValue};

                return $compile('<div ng-model="selectedReference.value" lc-reference="referenceEntityTypeId" is-multiple="true"></div>')(scope);
            }],
            password: [function (value) {
                return '';
            }, function (fieldDescription, controller, updateValue, clone, scope) { //TODO doubling
                var input = $('<input type="password" class="form-control"/>'); //TODO remove form-control?
                input.val(controller.$viewValue);
                input.on('input', function () {
                    var value = $.trim($(this).val());
                    updateValue(value.length > 0 ? value : undefined);
                });
                return input;
            }],
            relation: [false, function (fieldDescription, controller, updateValue, clone, scope) {
                scope.entityCrudId = null;
                scope.$parent.$watch('entity', function (entity) {
                    scope.entityCrudId = entity && entity.id ? {
                        entityTypeId: scope.entityTypeId,
                        relationField: fieldDescription.field,
                        parentEntityId: entity.id
                    } : undefined;
                });

                return $compile('<div ng-if="entityCrudId" lc-grid="entityCrudId" paging="{}" edit-mode="isEditor"></div><div ng-if="!entityCrudId">' + messages('Relation editing available after object creation') + '</div>')(scope);
            }],
            attachment: [function (value, fieldDescription) {
                if (!value) {
                    return undefined;
                }
                var elem;
                if (fieldDescription.fieldType.image) {
                    var link = $('<a data-gallery></a>');
                    link.attr('href', value.secure_url);
                    elem = $('<img>');
                    elem.attr('src', value.secure_url.replace(/\/v\d+/, '/w_100,h_100,c_fill'));
                    link.append(elem);
                    link.click (function (e) {
                        e.preventDefault();
                        blueimp.Gallery(link, {event: e});
                    });
                    if (!$('#blueimp-gallery').length) {
                        $('body').append('<div id="blueimp-gallery" class="blueimp-gallery"><div class="slides"></div><h3 class="title"></h3><a class="close">×</a></div>');
                    }
                    return link;
                }
                elem = $('<a></a>');
                elem.attr('href', '/api/file/download/' + value.fileId);
                elem.text(value.name);
                return elem;
            }, function (fieldDescription, controller, updateValue, clone, scope) {
                scope.fieldValue = controller.$viewValue;
                scope.$watch('fieldValue', function (value) {
                    controller.$setViewValue(value);
                });
                scope.provider = fieldDescription.fieldType.provider;
                return $compile('<div lc-upload="fieldValue" provider="{{provider}}"></div>')(scope);
            }],
            link: [function (value, fieldDescription) {
                var link = $('<a target="_blank"></a>');
                link.attr('href', value);
                link.text(value);
                return link;
            }, function (fieldDescription, controller, updateValue, clone, scope) {
                scope.linkValue = controller.$viewValue;
                scope.$watch('linkValue', function (linkValue) {
                    controller.$setViewValue(linkValue ? linkValue : undefined);
                });
                return $compile('<input type="url" ng-model="linkValue" class="form-control">')(scope);
            }],
            email: [function (value, fieldDescription) {
                var link = $('<a></a>');
                link.attr('href', 'mailto:' + value);
                link.text(value);
                return link;
            }, function (fieldDescription, controller, updateValue, clone, scope) {
                scope.emailValue = controller.$viewValue;
                scope.$watch('emailValue', function (emailValue) {
                    controller.$setViewValue(emailValue ? emailValue : undefined);
                });
                return $compile('<input type="email" ng-model="emailValue" class="form-control">')(scope);
            }]
        }
    }]);

    fieldRenderingServiceProvider.defineLayoutRenderers(function () { return {
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
                var elem = $('<li class="' + (index == 0 ? 'active' : '') +'"><a href="#">' + item.params.title + '</a></li>'); //TODO javascript injection? //TODO id generation
                elem.click(function () {
                    $('.tab-pane', container).removeClass('active');
                    $('li', container).removeClass('active');
                    elem.addClass('active');
                    $('#tab-' + index, container).addClass('active');
                });
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
    }});

    fieldRenderingServiceProvider.setFormStaticTemplate(["$compile", function ($compile) {
        return function (value, fieldScope) {
            var elem;
            if (value instanceof jQuery) {
                elem = $compile('<div class="form-control-static"></div>')(fieldScope);
                elem.append(value);
            } else {
                fieldScope.renderedText = value || '';
                elem = $compile('<div class="form-control-static">{{renderedText}}</div>')(fieldScope);
            }
            return elem;
        }
    }])
}]);

function uploadDirective(directiveName) {
    return ["rest", "fieldRenderingService", "$parse", "messages", function (rest, fieldRenderingService, $parse, messages) {
        return {
            restrict: 'A',
            templateUrl: '/assets/template/upload.html',
            scope: true,
            link: function (scope, element, attrs) {
                var fieldValueGetter = $parse(attrs[directiveName]);
                attrs.$observe('provider', function (provider) {
                    scope.options = {
                        url: ('/api/file/upload/' + provider) || '/api/file/upload',
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
                });

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

allcountModule.directive("aField", fieldDirective("aField")); //TODO deprecated

function layoutDirective(directiveName) {
    return ["rest", "fieldRenderingService", function (rest, fieldRenderingService) {
        return {
            restrict: 'A',
            scope: false,
            priority: 1000,
            transclude: 'element',
            link: function (scope, element, attrs, controller, transclude) {
                var currentLayout;
                var mainScope;

                function allocateFieldScope(field, parentScope) {
                    var childScope = parentScope.$new();
                    childScope[attrs.field] = field;
                    return childScope;
                }

                function allocateScope(params, parentScope) {
                    var childScope = parentScope.$new();
                    _.extend(childScope, params);
                    return childScope;
                }

                function renderChild(layoutElem, parentScope) {
                    var containerId = layoutElem.containerId;
                    if (containerId == 'field') {
                        return transclude(allocateFieldScope(layoutElem.params.field, parentScope), function (clone) { //TODO: compact field format
                            return clone;
                        });
                    }
                    return fieldRenderingService.layoutRenderer(
                        containerId,
                        layoutElem.params,
                        $(layoutElem.children).map(function (index, item) {
                            return function () {
                                return renderChild(item, allocateScope(layoutElem.params, parentScope));
                            }
                        }),
                        layoutElem.children,
                        parentScope
                    );
                }

                scope.$watch(attrs[directiveName], function (entityTypeId) {
                    rest.layout(entityTypeId, function (layout) {
                        if (mainScope) {
                            mainScope.$destroy();
                        }
                        mainScope = scope.$new();
                        if (currentLayout) {
                            currentLayout.remove();
                        }
                        currentLayout = renderChild(layout, mainScope);
                        element.after(currentLayout);
                    })
                });

                scope.labelWidthClass = function (labelWidth) {
                    return 'col-md-' + (labelWidth || 3);
                };

                scope.fieldWidthClass = function (labelWidth) {
                    return 'col-md-' + (12 - (labelWidth || 3));
                }
            }
        }
    }];
}

allcountModule.directive("aLayout", layoutDirective("aLayout")); //TODO deprecated
allcountModule.directive("lcLayout", layoutDirective("lcLayout"));

allcountModule.directive("aGrid", listDirective('aGrid', '/assets/template/grid.html')); //TODO deprecated
allcountModule.directive("lcGrid", listDirective('lcGrid', '/assets/template/grid.html'));

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

                scope.filtering = {};

                scope.$parent.$watch(attrs.filtering, function (filtering) {
                    scope.filtering = filtering;
                    if (scope.reload) scope.reload();
                }, true);

                scope.$parent.$watch(attrs[directiveName], function (entityTypeId) {
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

allcountModule.directive("aMessage", messageDirective("aMessage")); //TODO deprecated

allcountModule.directive("aMenu", menuDirective()); //TODO deprecated

allcountModule.directive("lcActions", ["rest", "messages", "$parse", "$modal", function (rest, messages, $parse, $modal) {
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
                    rest.actions(scope.entityCrudId, scope.actionTarget, scope.selectedItems).then(function (actions) {
                        scope.actions = _.map(actions, function (action) {
                            action.perform = function () {
                                action.isPerforming = true;
                                rest.performAction(entityCrudId, action.id, scope.selectedItems).then(function (actionResult) {
                                    action.isPerforming = false;
                                    if (actionResult.type === 'redirect') {
                                        window.location = actionResult.url;
                                    } else if (actionResult.type === 'refresh') {
                                        if (attrs.onRefresh) {
                                            scope.$eval(attrs.onRefresh);
                                        } else {
                                            throw new Error('on-refresh is not defined for lc-actions');
                                        }
                                    } else if (actionResult.type === 'modal') {
                                        var modalScope = scope.$new();
                                        modalScope.title = actionResult.title;
                                        modalScope.message = actionResult.message;
                                        $modal.open({
                                            templateUrl: '/assets/template/modal.html',
                                            scope: modalScope
                                        })
                                    } else {
                                        throw new Error('Unknown actionResult type "' + actionResult.type +  '" for ' + JSON.stringify(actionResult));
                                    }
                                }, function () {
                                    action.isPerforming = false;
                                });
                            };
                            action.name = messages(action.name);
                            return action;
                        });
                    });
                }
            }

            if (attrs.publishMethods) {
                var publishMethodsTo = $parse(attrs.publishMethods);
                publishMethodsTo.assign(scope.$parent, {
                    refresh: refresh
                })
            }
        }
    }
}]);

allcountModule.directive("lcReference", ["rest", "messages", function (rest, messages) {
    return {
        restrict: 'A',
        templateUrl: '/assets/template/reference.html',
        scope: true,
        require: 'ngModel',
        link: function (scope, element, attrs, controller) {
            scope.referenceViewState = {};
            scope.entityTypeId = null;

            scope.$parent.$watch(attrs.lcReference, function (entityTypeId) {
                if (!entityTypeId) {
                    return;
                }
                scope.entityTypeId = entityTypeId;

                var elem = $('.reference-input', element);

                var isMultiple = attrs.isMultiple && scope.$eval(attrs.isMultiple);
                var viewValueAndValEquals = function (element) {
                    if (!element.val()) {
                        return !controller.$viewValue;
                    }
                    return angular.equals(element.val().split(','), controller.$viewValue && _.map(controller.$viewValue, _.property('id')));
                };
                elem.select2({
                    ajax: {
                        url: "/api/entity/" + entityTypeId + '/reference-values',
                        dataType: 'json',
                        delay: 250,
                        data: function (term) {
                            return {
                                query: term
                            };
                        },
                        results: function (data, page) {
                            // parse the results into the format expected by Select2.
                            // since we are using custom formatting functions we do not need to
                            // alter the remote JSON data
                            return {results: data };
                        },
                        cache: true
                    },
                    tags: isMultiple,
                    text: function (item) {
                        return item && item.name;
                    },
                    initSelection: function (element, callback) {
                        if (isMultiple) {
                            if (element.val() && viewValueAndValEquals(element)) {
                                callback(controller.$viewValue);
                            }
                        } else {
                            if (element.val() === (controller.$viewValue && controller.$viewValue.id)) {
                                callback(controller.$viewValue);
                            }
                        }
                    }

                });

                function onChange() {
                    if (isMultiple) {
                        if (!viewValueAndValEquals(elem)) {
                            controller.$setViewValue(elem.val() && elem.select2('data') || null);
                        }
                    } else {
                        controller.$setViewValue(elem.val() && (controller.$viewValue && controller.$viewValue.id === elem.val() ? controller.$viewValue : elem.select2('data')) || null);
                    }
                }

                function phaseWrapper(func) {
                    return function () {
                        if(!scope.$$phase) {
                            scope.$apply(func);
                        } else {
                            func();
                        }
                    }
                }
                elem.on('change', phaseWrapper(onChange));

                controller.$render = function () {
                    elem.select2('data', controller.$viewValue);
                };

                controller.$render();

                function setValue(value) {
                    controller.$setViewValue(value);
                    controller.$render();
                }

                scope.clear = function () {
                    setValue(null);
                };

                scope.referenceViewState.onCreate = function () {
                    scope.referenceViewState.editForm.createEntity(function (entityId) { //TODO
                        rest.referenceValueByEntityId(entityTypeId, entityId).then(function (referenceValue) {
                            if (isMultiple) {
                                var v = _.clone(controller.$viewValue);
                                v.push(referenceValue);
                                setValue(v);
                            } else {
                                setValue(referenceValue);
                            }
                        });
                        scope.referenceViewState.isCreateModalShowing = false;
                    })
                };

                scope.createNewReferenceItem = function () {
                    scope.referenceViewState.isCreateModalShowing = true;
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
                }, true);

                function fireIsShowing(isShowing) {
                    scope.show = isShowing;
                    var assign = function () {
                        assignIsShowing(scope.$parent, isShowing);
                    };
                    if(!scope.$$phase) {
                        scope.$apply(assign);
                    } else {
                        assign();
                    }
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
            function isTouchDevice(){
                return true == ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);
            }
            if (!isTouchDevice()) {
                messages.messagePromise(attrs.lcTooltip).then(function (msg) {
                    $(element).tooltip({
                        placement: 'bottom',
                        title: msg
                    });
                });
            }
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