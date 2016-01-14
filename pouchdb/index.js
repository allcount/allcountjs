exports.installModule = function (injection) {
    injection.bindFactory('storageDriver', require('./pouchdb-storage-driver'));
};