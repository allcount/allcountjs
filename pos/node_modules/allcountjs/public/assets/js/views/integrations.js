angular.module('allcount').controller('IntegrationsController', ['$scope', '$http', function ($scope, $http) {
    $scope.loadAvailableIntegrations = function () {
        return $http.get('/api/integrations').then(function (resp) {
            $scope.integrations = resp.data;
            $scope.appIdToIntegration = _.chain(resp.data).map(function (i) { return [i.appId, i] }).object().value();
        });
    };

    $scope.loadAvailableIntegrations();
}]);