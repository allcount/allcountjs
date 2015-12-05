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
            function notAuthenticated(req, res) {
                if (req.url.indexOf('/api/') === 0) {
                    res.status(403).send("Not authenticated");
                } else {
                    res.redirect('/login');
                }
            }

            function checkOnlyAuthenticated(req, res, next) {
                if (!req.user && securityService.onlyAuthenticated) {
                    notAuthenticated(req, res);
                } else {
                    next();
                }
            }
            var crudOperationsRouter = express.Router();
            var appAccessRouter = express.Router()
                .use(securityRoute.authenticateWithTokenMiddleware)
                .use(function (req, res, next) {
                    res.loginOrForbidden = function () {
                        if (!req.user) {
                            notAuthenticated(req, res);
                        } else {
                            templateVarService.setupLocals(req, res);
                            res.render('permission-denied');
                        }
                    };
                    next();
                })
                .use(crudRoute.withUserScope)
                .get('/entity/:entityTypeId', checkOnlyAuthenticated, entityRoute.entity)
                .get('/entity/:entityTypeId/:entityId', checkOnlyAuthenticated, entityRoute.entity)
                .get('/entity/:entityTypeId/:entityId/:state', checkOnlyAuthenticated, entityRoute.entity)
                .get('/api/entity/:entityTypeId/permissions', checkOnlyAuthenticated, fieldDescriptionsRoute.permissions);


            customViewsRoute.setupCustomViews(appAccessRouter); //TODO checkOnlyAuthenticated
            if (!viewService.views['/']) {
                appAccessRouter.get('/', checkOnlyAuthenticated, indexRoute.index);
            }

            crudOperationsRouter.use(crudRoute.checkReadPermissionMiddleware);

            crudOperationsRouter.get('/api/file/download/:fileId', checkOnlyAuthenticated, crudRoute.downloadFile);
            crudOperationsRouter.post('/api/file/upload', checkOnlyAuthenticated, busboy(), crudRoute.uploadFile);
            crudOperationsRouter.post('/api/file/upload/:provider', checkOnlyAuthenticated, busboy(), crudRoute.uploadFile);

            crudOperationsRouter.get('/api/entity/:entityTypeId/reference-values', checkOnlyAuthenticated, crudRoute.referenceValues);
            crudOperationsRouter.get('/api/entity/:entityTypeId/reference-values/:entityId', checkOnlyAuthenticated, crudRoute.referenceValueByEntityId);

            crudOperationsRouter.get('/api/entity/:entityTypeId/layout', checkOnlyAuthenticated, fieldDescriptionsRoute.layout);
            crudOperationsRouter.get('/api/entity/:entityTypeId/entity-description', checkOnlyAuthenticated, fieldDescriptionsRoute.entityDescription);
            crudOperationsRouter.get('/api/entity/:entityTypeId/field-descriptions', checkOnlyAuthenticated, fieldDescriptionsRoute.fieldDescriptions);
            crudOperationsRouter.post('/api/entity/:entityTypeId/actions/:actionId', checkOnlyAuthenticated, actionsRoute.performAction);
            crudOperationsRouter.get('/api/entity/:entityTypeId/actions', checkOnlyAuthenticated, actionsRoute.actionList);

            crudOperationsRouter.get('/api/entity/:entityTypeId/count', checkOnlyAuthenticated, crudRoute.findCount);
            crudOperationsRouter.get('/api/entity/:entityTypeId', checkOnlyAuthenticated, crudRoute.findRange);
            crudOperationsRouter.post('/api/entity/:entityTypeId', checkOnlyAuthenticated, crudRoute.createEntity);
            crudOperationsRouter.get('/api/entity/:entityTypeId/:entityId', checkOnlyAuthenticated, crudRoute.readEntity);
            crudOperationsRouter.put('/api/entity/:entityTypeId', checkOnlyAuthenticated, crudRoute.updateEntity);
            crudOperationsRouter.delete('/api/entity/:entityTypeId/:entityId', checkOnlyAuthenticated, crudRoute.deleteEntity);

            appAccessRouter.use(crudOperationsRouter);
            appAccessRouter.get('/api/menus', checkOnlyAuthenticated, menuRoute.menus);
            appAccessRouter.get('/api/app-info', checkOnlyAuthenticated, menuRoute.appInfo);
            app.get('/api/messages', messages.messagesObj);

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
            app.get('/login', crudRoute.withUserScope, securityRoute.login);
            app.post('/api/sign-up', securityRoute.signUp);
            app.post('/api/sign-in', securityRoute.apiSignIn);
            app.get('/logout', securityRoute.logout);
            app.get('/js/messages.js', messages.messagesNgModule);
            app.use(appAccessRouter);
        }
    };
};