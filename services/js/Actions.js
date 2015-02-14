var Q = require('q');

module.exports = function (crudService, googleExportService, actionContext) {
    return {
        navigateToEntityTypeResult: function (entityTypeId) {
            return Q({
                type: 'redirect',
                url: '/entity/' + entityTypeId
            });
        },
        exportAllRowsToGoogleSpreadsheet: function (googleWebAppUrl, fileName, templateId, folderId) {
            return crudService.strategyForCrudId(actionContext.entityCrudId).findAll({}).then(function (rows) {
                return googleExportService.exportToSpreadsheet(googleWebAppUrl, fileName, {rows: rows}, templateId, folderId);
            })
        },
        openGoogleDocument: function (exportActionResult) {
            return Q({
                type: 'redirect',
                url: exportActionResult
            })
        },
        refreshResult: function () {
            return Q({
                type: 'refresh'
            })
        },
        modalResult: function (title, message) {
            return Q({
                type: 'modal',
                title: title,
                message: message
            })
        },
        selectedEntityId: function () {
            return actionContext.entityId;
        }
    }
};
