"use strict";

var q = require('q');

exports.installModule = function (injection) {
    injection.bindMultiple('compileServices', [
        'MailgunService'
    ]);

    injection.bindFactory('mailgunIntegrationConfig', function (app, appAccessRouter, express, MailgunService, securityService) {
            return {
                configure: function () {
                    app.all('/api/mailgun/incoming', function (req, res, next) {
                        return injection.inScope({
                            Message: req.body
                        }, function () {
                            return q(securityService.asSystemUser(function () {
                                return MailgunService.config.propertyValue('onMessage');
                            })).then(function () {
                                res.sendStatus(200);
                            }).catch(function (err) {
                                next(err);
                            });
                        });
                    });
                }
            };
        }
    );

    injection.bindMultiple('appConfigurators', [
        'mailgunIntegrationConfig'
    ]);

    injection.bindFactory('MailgunService', require(require('path').join(__dirname, 'mailgun-integration-service.js')));
};
