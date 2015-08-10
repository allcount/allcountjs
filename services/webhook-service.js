var _ = require('underscore');
var Q = require('q');

module.exports = function (injection, appUtil, securityService) {
    var service = {};

    service.compile = function (objects, errors) {
        service.webhookPathToHandler = {};
        objects.forEach(function (obj) {
            var webhookPathToHandler = obj.propertyValue('webHooks');
            if (webhookPathToHandler) {
                _.forEach(webhookPathToHandler.obj, function (value, propertyName) {
                    service.webhookPathToHandler[propertyName] = function (req, res, next) {
                        securityService.asSystemUser(function () {
                            injection.inScope({
                                Body: req.body,
                                Params: req.params,
                                Query: req.query,
                                Res: {
                                    json: function (json) {
                                        if (!json) {
                                            throw new Error("Empty json response");
                                        }
                                        return { json: json }
                                    },
                                    text: function (text) {
                                        if (!text) {
                                            throw new Error("Empty text response");
                                        }
                                        return { text: text }
                                    }
                                }
                            }, function () {
                                Q(webhookPathToHandler.propertyValue(propertyName)).then(function (response) {
                                    if (response) {
                                        if (response instanceof appUtil.ConfigObject) {
                                            response = response.evaluateProperties();
                                        }
                                        if (response.json) {
                                            res.json(response.json);
                                        } else if (response.text) {
                                            res.send(response.text);
                                        } else {
                                            throw new Error("Unknown webhook response: " + JSON.stringify(response));
                                        }
                                    } else {
                                        res.send();
                                    }
                                }).catch(next);
                            });
                        });
                    }
                });
            }
        });
    };

    return service;
};