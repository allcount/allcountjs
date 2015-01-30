allcountModule.controller('TopEntityEditorController', ['$scope', 'rest', '$injector', function ($scope, rest, $injector) {
    $injector.invoke(EntityViewController, this, {$scope: $scope});

    $scope.$watch('entityTypeId', function (entityTypeId) {
        if (!entityTypeId) {
            return;
        }
        rest.findRange({entityTypeId: entityTypeId}, {}, 0, 1).then(function (entites) {
            if (entites[0].id) {
                $scope.navigateTo(entites[0].id);
                $scope.startEditing();
            }
        })
    });
}]);