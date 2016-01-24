angular.module("allcount").factory('socket', function () {
    return io();
});

angular.module("allcount").directive("lcSocketListen", ["socket", function (socket) {
    return {
        restrict: 'A',
        scope: false,
        link: function (scope, element, attrs) {
            attrs.$observe('lcSocketListen', function (entityCrudId) {
                if (!entityCrudId) {
                    return;
                }
                socket.emit('listen-entity-change', entityCrudId);
                socket.on('entity-change', function (changedEntityCrudId) {
                    if (changedEntityCrudId === entityCrudId) {
                        scope.$eval(attrs.onSocketChange);
                    }
                })
            })
        }
    }
}]);
