var path = require('path');
var busboy = require('connect-busboy');
var Q = require('q');

module.exports = function (
    app,
    injection,
    securityService,
    express,
    templateVarService,
    entityRoute,
    fieldDescriptionsRoute,
    crudRoute,
    customViewsRoute,
    indexRoute,
    viewService,
    actionsRoute,
    menuRoute,
    securityRoute,
    passport,
    messages
) {
    return {
        setup: function () {
            var crudOperationsRouter = express.Router();
            var crudWriteOperationsRouter = express.Router();
            var appAccessRouter = express.Router()
                .use(function (req, res, next) {
                    res.loginOrForbidden = function () {
                        if (!req.user) {
                            res.redirect('/login');
                        } else {
                            templateVarService.setupLocals(req, res);
                            res.render('permission-denied');
                        }
                    };
                    if (!req.user && securityService.onlyAuthenticated) {
                        res.redirect('/login');
                    } else {
                        next();
                    }
                })
                .get('/entity/:entityTypeId', entityRoute.entity)
                .get('/rest/layout/:entityTypeId', fieldDescriptionsRoute.layout)
                .post('/rest/field-descriptions', fieldDescriptionsRoute.fieldDescriptions)
                .post('/rest/permissions', fieldDescriptionsRoute.permissions)
                .get('/rest/reference/values/:entityTypeId', crudRoute.referenceValues)
                .get('/rest/reference/values/:entityTypeId/top', crudRoute.referenceValues)
                .get('/rest/reference/values/:entityTypeId/queries/:queryText', crudRoute.referenceValues)
                .get('/rest/reference/values/:entityTypeId/by-id/:entityId', crudRoute.referenceValueByEntityId);

            customViewsRoute.setupCustomViews(appAccessRouter);
            if (!viewService.views['/']) {
                appAccessRouter.get('/', indexRoute.index);
            }

            crudOperationsRouter.use(crudRoute.checkReadPermissionMiddleware);
            crudWriteOperationsRouter.use(crudRoute.checkWritePermissionMiddleware);
            crudOperationsRouter.post('/rest/crud/find-count', crudRoute.findCount);
            crudOperationsRouter.post('/rest/crud/find-range', crudRoute.findRange);
            crudWriteOperationsRouter.post('/rest/crud/create', crudRoute.createEntity);
            crudOperationsRouter.post('/rest/crud/read', crudRoute.readEntity);
            crudOperationsRouter.get('/rest/download/:fileId', crudRoute.downloadFile);
            crudWriteOperationsRouter.post('/rest/crud/update', crudRoute.updateEntity);
            crudWriteOperationsRouter.post('/rest/crud/delete', crudRoute.deleteEntity);
            crudWriteOperationsRouter.post('/rest/upload', busboy(), crudRoute.uploadFile);
            crudOperationsRouter.post('/rest/actions', actionsRoute.actionList);
            crudOperationsRouter.post('/rest/actions/perform', actionsRoute.performAction);
            crudOperationsRouter.use(crudWriteOperationsRouter);
            appAccessRouter.use(crudOperationsRouter);
            appAccessRouter.get('/rest/menus', menuRoute.menus);

            injection.inScope({
                app: function () { return app },
                appAccessRouter: function () { return appAccessRouter }
            }, function () {
                injection.inject('appConfigurators').forEach(function (configurator) { configurator.configure() });
            });

            app.post('/login', securityRoute.performLogin(Q.nfbind(function (req, res, callback) {
                passport.authenticate('local', function (err, user) {
                    callback(err, user)
                })(req, res);
            })));
            app.get('/login', securityRoute.login);
            app.get('/logout', securityRoute.logout);
            app.get('/js/messages.js', messages.messagesNgModule);
            app.use(appAccessRouter);
        }
    };
};