module.exports = function (integrationProviders, crudService) {
    return {
        availableIntegrations: function () {
            return integrationProviders.map(function (integration) {
                return {
                    appId: integration.appId,
                    appName: integration.appName,
                    getAccessTokenUrl: integration.accessTokenUrl()
                }
            })
        },
        updateIntegrationAccessToken: function (integrationId, accessToken) {
            return crudService.strategyForCrudId('Integration').updateEntity({id: integrationId, accessToken: accessToken});
        },
        accessTokenByIntegrationName: function (name) {
            return crudService.strategyForCrudId('Integration').findAll({filtering: {name: name}}).then(function (tokens) {
                if (!tokens[0]) {
                    throw new Error('Token not found for integration name: ' + name);
                }
                return tokens[0].accessToken;
            });
        },
        integrationsForAppId: function (appId) {
            return crudService.strategyForCrudId('Integration').findAll({filtering: {appId: appId}}).then(function (integrations) {
                return integrations;
            });
        }
    }
};