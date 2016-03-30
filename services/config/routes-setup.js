var path = require('path');
var busboy = require('connect-busboy');
var Q = require('q');
var methods = require('methods');
var _ = require('underscore');

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
            var appAccessRouter = express.Router();

            var setupDefaultMiddlewareAfterMatch = function (router) {
                _.union(['all'], methods).forEach(function (method) {
                    var superMethod = router[method];
                    router[method] = function () {
                        var nextArguments = Array.prototype.concat.apply([], arguments);
                        nextArguments.splice(1, 0, checkOnlyAuthenticated);
                        return superMethod.apply(this, nextArguments);
                    }
                });
            };
            setupDefaultMiddlewareAfterMatch(crudOperationsRouter);
            setupDefaultMiddlewareAfterMatch(appAccessRouter);

            appAccessRouter.use(securityRoute.authenticateWithTokenMiddleware)
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
                .get('/entity/:entityTypeId', entityRoute.entity)
                .get('/entity/:entityTypeId/:entityId', entityRoute.entity)
                .get('/entity/:entityTypeId/:entityId/:state', entityRoute.entity)
                .get('/api/entity/:entityTypeId/permissions', fieldDescriptionsRoute.permissions);


            customViewsRoute.setupCustomViews(appAccessRouter);
            if (!viewService.views['/']) {
                appAccessRouter.get('/', indexRoute.index);
            }

            crudOperationsRouter.use(crudRoute.checkReadPermissionMiddleware);

            crudOperationsRouter.get('/api/file/download/:fileId', crudRoute.downloadFile);
            crudOperationsRouter.post('/api/file/upload', busboy(), crudRoute.uploadFile);
            crudOperationsRouter.post('/api/file/upload/:provider', busboy(), crudRoute.uploadFile);

            crudOperationsRouter.get('/api/entity/:entityTypeId/reference-values', crudRoute.referenceValues);
            crudOperationsRouter.get('/api/entity/:entityTypeId/reference-values/:entityId', crudRoute.referenceValueByEntityId);

            crudOperationsRouter.get('/api/entity/:entityTypeId/layout', fieldDescriptionsRoute.layout);
            crudOperationsRouter.get('/api/entity/:entityTypeId/entity-description', fieldDescriptionsRoute.entityDescription);
            crudOperationsRouter.get('/api/entity/:entityTypeId/field-descriptions', fieldDescriptionsRoute.fieldDescriptions);
            crudOperationsRouter.post('/api/entity/:entityTypeId/actions/:actionId', actionsRoute.performAction);
            crudOperationsRouter.post('/api/entity/:entityTypeId/actions', actionsRoute.actionList);

            crudOperationsRouter.get('/api/entity/:entityTypeId/count', crudRoute.findCount);
            crudOperationsRouter.get('/api/entity/:entityTypeId', crudRoute.findRange);
            crudOperationsRouter.post('/api/entity/:entityTypeId', crudRoute.createEntity);
            crudOperationsRouter.get('/api/entity/:entityTypeId/:entityId', crudRoute.readEntity);
            crudOperationsRouter.put('/api/entity/:entityTypeId', crudRoute.updateEntity);
            crudOperationsRouter.delete('/api/entity/:entityTypeId/:entityId', crudRoute.deleteEntity);

            appAccessRouter.use(crudOperationsRouter);
            appAccessRouter.get('/api/menus', menuRoute.menus);
            appAccessRouter.get('/api/app-info', menuRoute.appInfo);
            app.get('/api/messages', function (req, res, next) {
                securityRoute.setAccessControlHeaders(res);
                next()
            }, messages.messagesObj);

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