allcountModule.controller('LoginController', ['$scope', 'rest', function ($scope, rest) {
    $scope.isSignUp = false;

    $scope.user = {};

    $scope.passwordMatches = function () {
        return $scope.user.username && $scope.user.password && $scope.user.passwordRepeat === $scope.user.password;
    };

    $scope.signUp = function () {
        if (!$scope.passwordMatches()) {
            return;
        }

        $scope.validationErrors = undefined;

        rest.signUp($scope.user.username, $scope.user.password).then(function () {
            $('form').submit();
        }, handleValidationErrorsCallback($scope))
    };
}]);