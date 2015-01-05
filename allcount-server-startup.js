
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var cons = require('consolidate');
var domain = require('domain');
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;
var Q = require('q');
var busboy = require('connect-busboy');
var _ = require('underscore');
var jade = require('jade');

module.exports = function (
    appService,
    securityService,
    messages,
    securityRoute,
    entityRoute,
    fieldDescriptionsRoute,
    crudRoute,
    indexRoute,
    gitRepoUrl,
    proxyHandler,
    customViewsRoute,
    viewService,
    templateVarService,
    injection,
    keygrip,
    port,
    httpServer,
    menuRoute,
    actionsRoute,
    sessionMiddleware,
    viewPaths,
    repositoryService,
    appUtil
    ) {
    return {
        startup: function (onReady) {
            var app = express();

            app.engine('html', cons.just);
            app.engine('jade', jade.renderFile);
            app.set('port', port);
            app.set('view engine', 'jade');

            app.use(function(req, res, next) {
                var requestDomain = domain.create();
                requestDomain.add(req);
                requestDomain.add(res);
                requestDomain.on('error', next);
                requestDomain.run(next);
            });

            securityService.initDefaultUsers();

            passport.use(new LocalStrategy(securityService.authenticate));

            passport.serializeUser(securityService.serializeUser);

            passport.deserializeUser(securityService.deserializeUser);

            app.use(require('body-parser')());
            var cssOutputPath = path.join(process.cwd(), 'tmp/css');
            app.use(require('less-middleware')({ src: path.join(__dirname, 'public'), dest: cssOutputPath }));
            app.use(express.static(path.join(__dirname, 'public')));
            app.use(express.static(cssOutputPath));
            app.use(sessionMiddleware);
            app.use(passport.initialize());
            app.use(passport.session());

            appService.compile(function (errors) {
                app.set('views', _.union(repositoryService.repositoryDir(), _.flatten(viewPaths)));
                if (errors.length > 0) {
                    if (onReady) {
                        onReady(errors);
                    }
                    throw new Error(errors.join('\n'));
                } else {
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
                    app.use(function (req, res, next) {
                        templateVarService.setupLocals(req, res);
                        res.status(404).render('not-found');
                    });
                    app.use(function (err, req, res, next) {
                        templateVarService.setupLocals(req, res);
                        if (err instanceof appUtil.ValidationError) {
                            res.status(403).json(err.fieldNameToMessage);
                        } else if (err) {
                            console.error(err.stack);
                            res.locals.error = err;
                            res.status(500).render('error');
                        }
                    })
                }

                httpServer(function (req, res) {
                    proxyHandler(req, res, function () {
                        app(req, res);
                    });
                }, function() {
                    console.log('Application server for "' + gitRepoUrl + '" listening on port ' + app.get('port'));
                    if (onReady) {
                        onReady();
                    }
                });
            });
        }
    }


};

