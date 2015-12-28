angular.module("allcount").directive("lcSocketListen", [function () {
    return {
        restrict: 'A',
        scope: false,
        link: function (scope, element, attrs) {
            attrs.$observe('lcSocketListen', function (entityCrudId) {
                if (!entityCrudId) {
                    return;
                }
                var socket = io();
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
