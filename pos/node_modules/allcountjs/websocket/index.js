exports.installModule = function (injection) {
    injection.overrideFactory('httpServer', 'oldHttpServer', function (oldHttpServer, ioSetup) {
        return function (appHandler, onReady) {
            var httpServer = oldHttpServer(appHandler, onReady);
            ioSetup.setIo(require('socket.io')(httpServer));
            return httpServer;
        }
    });
    injection.bindFactory('ioSetup', function (storageDriver, entityDescriptionService) {
        return {
            setIo: function (io) {
                io.on('connection', function (socket) {
                    var listeners = [];
                    socket.on('listen-entity-change', function (entityCrudId) {
                        listeners.push(storageDriver.addAfterCrudListener(entityDescriptionService.tableDescription(entityCrudId), function () { //TODO use cloud compatible tracking way
                            socket.emit('entity-change', entityCrudId);
                        }));
                    });
                    socket.on('disconnect', function () {
                        listeners.forEach(function (l) { l.remove() });
                    });
                })
            }
        }
    })
};