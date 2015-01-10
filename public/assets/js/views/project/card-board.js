var cardBoardModule = angular.module('allcount-card-board', ['allcount', 'ui.sortable']);

function BoardController($scope, rest, $q) {
    $scope.boardItems = {};
    $scope.statusField = $scope.statusField || 'status';
    $scope.summaryField = $scope.summaryField || 'summary';

    function statusFieldValue(fieldValue) {
        return (_.isObject(fieldValue) ? fieldValue.id : fieldValue) || '';
    }

    $scope.$watch('items', function (items) {
        $scope.boardItems = {};
        initializeBoardItemArrays();
        _.forEach(items, function (item) {
            var fieldValue = item[$scope.statusField];
            fieldValue = statusFieldValue(fieldValue);
            $scope.boardItems[fieldValue] = $scope.boardItems[fieldValue] || [];
            $scope.boardItems[fieldValue].push(item);
        });
    }, true);

    $scope.$watch('boardItems', function (boardItems) {
        $q.all(_.chain(boardItems).map(function (column, columnId) {
            return _.map(column, function (item) {
                if (statusFieldValue(item[$scope.statusField]) !== columnId) {
                    var update = {id: item.id};
                    update[$scope.statusField] = {id: columnId || undefined};
                    return rest.updateEntity($scope.entityTypeId, update);
                }
            })
        }).flatten().value()).then(function () {
            $scope.gridMethods.updateGrid();
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
            initializeBoardItemArrays();
        });
    });


    $scope.boardColumnClasses = function () {
        return 'col-xs-' + Math.max(1, Math.round(12 / ($scope.boardColumns.length || 1)));
    }
}