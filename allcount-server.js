var injection = require('./services/injection.js');
var path = require('path');

injection.addNameMatcher(/(.*?)Route/, function (serviceName) {
    return './routes/' + injection.camelHumpsToWireName(serviceName) + '.js';
}, require);

injection.bindFactory('entityCrudStrategy', require('./services/crud/entity-crud-strategy'));
injection.bindMultiple('compileServices', [
    'migrationService',
    'themeService',
    'trackingService',
    'menuService',
    'viewService',
    'computedFieldService',
    'actionService',
    'entityDescriptionService',
    'securityService',
    'messagesService'
]);
injection.bindMultiple('crudStrategies', ['entityCrudStrategy']);
injection.bindFactory('menuRoute', require('./routes/menu-route'));
injection.bindFactory('indexRoute', require('./routes'));
injection.bindFactory('entityRoute', require('./routes/entity'));
injection.bindFactory('fieldDescriptionsRoute', require('./routes/field-descriptions'));
injection.bindFactory('crudRoute', require('./routes/crud'));
injection.bindFactory('securityRoute', require('./routes/security'));
injection.bindFactory('customViewsRoute', require('./routes/custom-views'));
injection.bindFactory('messages', require('./routes/messages'));
injection.bindFactory('fieldsApi', require('./services/js/Fields'));
injection.bindFactory('allcountServerStartup', require('./allcount-server-startup'));
injection.bindMultiple('viewPaths', ['defaultViewPathProvider']);
injection.bindFactory('defaultViewPathProvider', function () {
    return [path.join(__dirname, 'views')];
});
injection.bindFactory('express', function () { return require('express') });

module.exports = injection;
