module.exports = function (appAccessRouter, integrationService) {
    return {
        configure: function () {
            appAccessRouter.get('/api/integrations', function (req, res) {
                res.json(integrationService.availableIntegrations());
            })
        }
    }
};