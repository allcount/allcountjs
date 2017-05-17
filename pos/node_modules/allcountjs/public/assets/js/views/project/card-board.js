var cardBoardModule = angular.module('allcount-card-board', ['allcount', 'ui.sortable']);

cardBoardModule.controller('BoardController', ['$scope', 'rest', '$q', function ($scope, rest, $q) {
    $scope.boardItems = {};
    $scope.statusField = $scope.statusField || 'status';
    $scope.summaryField = $scope.summaryField || 'summary';
    var controller = this;

    function statusFieldValue(fieldValue) {
        return (_.isObject(fieldValue) ? fieldValue.id : fieldValue) || '';
    }

    function updateBoardItems(items) {
        $scope.boardItems = {};
        initializeBoardItemArrays();
        _.forEach(items, function (item) {
            var fieldValue = item[$scope.statusField];
            fieldValue = statusFieldValue(fieldValue);
            $scope.boardItems[fieldValue] = $scope.boardItems[fieldValue] || [];
            $scope.boardItems[fieldValue].push(item);
        });
    }

    $scope.$watch('items', updateBoardItems, true);

    $scope.$watch('boardItems', function (boardItems) {
        $q.all(_.chain(boardItems).map(function (column, columnId) {
            return _.map(column, function (item) {
                if (statusFieldValue(item[$scope.statusField]) !== columnId) {
                    var update = {id: item.id};
                    update[$scope.statusField] = columnId && {id: columnId} || null;
                    return rest.updateEntity($scope.entityTypeId, update);
                }
            })
        }).flatten().filter(_.identity).value()).then(function (results) {
            if (results.length > 0) {
                $scope.viewState.gridMethods.updateGrid();
            }
        }, function () {
            updateBoardItems($scope.items);
        });
    }, true);

    function initializeBoardItemArrays() {
        _.forEach($scope.boardColumns, function (value) {
            $scope.boardItems[value.id || ''] = $scope.boardItems[value.id || ''] || [];
        });
    }

    $scope.$watch('entityTypeId', function (entityTypeId) {
        rest.getFieldDescriptions(entityTypeId, false).then(function (descriptions) {
            var statusFieldDescription = _.find(descriptions, function (d) {
                return d.field === $scope.statusField;
            });
            return rest.referenceValues(statusFieldDescription.fieldType.referenceEntityTypeId);
        }).then(function (statusReferenceValues) {
            $scope.boardColumns = statusReferenceValues;
            if (controller.hideNotSetColumn) {
                $scope.boardColumns = _.filter($scope.boardColumns, function (obj) {
                    return !!obj.id;
                })
            }
            initializeBoardItemArrays();
        });
    });


    $scope.boardColumnClasses = function () {
        return 'col-xs-' + Math.max(1, Math.round(12 / ($scope.boardColumns.length || 1)));
    }
}]);