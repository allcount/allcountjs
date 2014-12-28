function EntityViewController ($scope) {
    $scope.viewState = {
        mode: 'list',
        filtering: {}
    };

    $scope.returnToGrid = function () {
        $scope.viewState.mode = 'list';
        $scope.viewState.isFormEditing = false;
        $scope.pagingMethods.refresh();
        $scope.gridMethods.updateGrid();
    };

    $scope.navigateTo = function (entityId) {
        $scope.viewState.formEntityId = entityId;
        $scope.viewState.mode = 'form';
    };

    $scope.startEditing = function () {
        $scope.editForm.reloadEntity(function () {
            $scope.viewState.isFormEditing = true;
        });
    };

    $scope.doneEditing = function () {
        $scope.viewState.isFormEditing = false;
        $scope.editForm.updateEntity(function () {
            $scope.editForm.reloadEntity();
        });
    };

    $scope.startGridEditing = function() {
        $scope.viewState.editState = true;
    };

    $scope.doneGridEditing = function() {
        $scope.viewState.editState = false;
        setTimeout(function () {
            $scope.$evalAsync(function () {
                $scope.pagingMethods.refresh();
                $scope.gridMethods.updateGrid();
            });
        }, 400); //TODO delay for animation hack
    };

    $scope.toCreate = function () {
        $scope.viewState.mode = 'create';
        $scope.createForm.reloadEntity();
    };

    $scope.refreshOnAction = function () {
        $scope.pagingMethods.refresh();
        $scope.gridMethods.updateGrid();
        $scope.editForm.reloadEntity();
    };
}