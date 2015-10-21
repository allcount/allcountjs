var EntityViewController = ['$scope', 'track', '$window', '$location', function ($scope, track, $window, $location) {
    $scope.viewState = {
        mode: 'list',
        filtering: {}
    };

    track('allcount-entity-load', {
        location: $window.location.href
    });

    $scope.returnToGrid = function () {
        track('allcount-entity-return-to-grid', {
            location: $window.location.href
        });
        $scope.viewState.mode = 'list';
        $scope.viewState.isFormEditing = false;
        $scope.viewState.pagingMethods && $scope.viewState.pagingMethods.refresh();
        $scope.viewState.gridMethods && $scope.viewState.gridMethods.updateGrid();
    };

    $scope.navigateTo = function (entityId) {
        track('allcount-entity-navigate-to', {
            location: $window.location.href,
            entityId: entityId
        });
        $scope.viewState.formEntityId = entityId;
        $scope.viewState.mode = 'form';
    };

    $scope.startEditing = function () {
        track('allcount-entity-start-editing', {
            location: $window.location.href
        });
        $scope.viewState.editForm.reloadEntity(function () {
            $scope.viewState.isFormEditing = true;
        });
    };

    $scope.doneEditing = function () {
        track('allcount-entity-done-editing', {
            location: $window.location.href
        });
        $scope.viewState.editForm.updateEntity(function () {
            $scope.viewState.isFormEditing = false;
            $scope.viewState.editForm.reloadEntity();
            $scope.viewState.actionMethods && $scope.viewState.actionMethods.refresh();
        });
    };

    $scope.deleteEntity = function () {
        track('allcount-entity-delete', {
            location: $window.location.href
        });
        $scope.viewState.editForm.deleteEntity(function () {
            $scope.viewState.mode = 'list';
            $scope.viewState.isFormEditing = false;
            delete $scope.viewState['formEntityId'];
            $scope.viewState.pagingMethods && $scope.viewState.pagingMethods.refresh();
            $scope.viewState.gridMethods && $scope.viewState.gridMethods.updateGrid();
            delete $scope.errorMessage;
        }).catch(function (err) {
            $scope.errorMessage = err.data;
        });
    };

    $scope.startGridEditing = function() {
        track('allcount-entity-start-grid-editing', {
            location: $window.location.href
        });
        $scope.viewState.editState = true;
    };

    $scope.doneGridEditing = function() {
        track('allcount-entity-done-grid-editing', {
            location: $window.location.href
        });
        $scope.viewState.editState = false;
        setTimeout(function () {
            $scope.$evalAsync(function () {
                $scope.viewState.pagingMethods && $scope.viewState.pagingMethods.refresh();
                $scope.viewState.gridMethods && $scope.viewState.gridMethods.updateGrid();
                $scope.viewState.actionMethods && $scope.viewState.actionMethods.refresh();
            });
        }, 400); //TODO delay for animation hack
    };

    $scope.toCreate = function () {
        track('allcount-entity-create', {
            location: $window.location.href
        });
        $scope.viewState.mode = 'create';
        $scope.viewState.createForm.reloadEntity();
    };

    $scope.refreshOnAction = function () {
        $scope.viewState.pagingMethods && $scope.viewState.pagingMethods.refresh();
        $scope.viewState.gridMethods && $scope.viewState.gridMethods.updateGrid();
        $scope.viewState.editForm && $scope.viewState.editForm.reloadEntity();
    };

    $scope.showList = function () {
        return $scope.viewState.mode === "list" && $scope.viewState.paging && $scope.viewState.paging.count > 0 || $scope.viewState.editState;
    };

    $scope.updateStateFromLocation = function () {
        var splitPath = _.filter(($location.path() || '').split('/'), _.identity);
        if (splitPath.length === 1 && splitPath[0]) {
            if (splitPath[0] === 'new') {
                $scope.viewState.mode = 'create';
            } else {
                $scope.viewState.formEntityId = splitPath[0];
                $scope.viewState.mode = 'form';
            }
            $scope.viewState.isFormEditing = false;
        } else if (splitPath.length === 2) {
            $scope.viewState.formEntityId = splitPath[0];
            $scope.viewState.mode = 'form';
            $scope.viewState.isFormEditing = true;
        } else {
            $scope.viewState.mode = 'list';
            $scope.viewState.isFormEditing = false;
        }
    };

    $scope.updateLocationFromState = function () {
        if ($scope.viewState.mode === 'form') {
            $location.path($scope.viewState.formEntityId + ($scope.viewState.isFormEditing ? '/edit' : ''));
        } else if ($scope.viewState.mode === 'create') {
            $location.path('new')
        } else {
            $location.path(null);
        }
    };

    $scope.$on('$locationChangeStart', $scope.updateStateFromLocation);
    $scope.$watch('viewState.mode', $scope.updateLocationFromState);
    $scope.$watch('viewState.formEntityId', $scope.updateLocationFromState);
    $scope.$watch('viewState.isFormEditing', $scope.updateLocationFromState);

    // backward compatibility
    $scope.$watch('viewState.editForm', function (editForm) {
        $scope.editForm = editForm;
    });
    $scope.$watch('viewState.createForm', function (createForm) {
        $scope.createForm = createForm;
    });
    $scope.$watch('viewState.gridMethods', function (gridMethods) {
        $scope.gridMethods = gridMethods;
    });
    $scope.$watch('viewState.pagingMethods', function (pagingMethods) {
        $scope.pagingMethods = pagingMethods;
    });
    $scope.$watch('viewState.actionMethods', function (actionMethods) {
        $scope.actionMethods = actionMethods;
    });

    $scope.updateStateFromLocation();
}];

allcountModule.controller('EntityViewController', EntityViewController);