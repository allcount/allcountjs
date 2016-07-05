'use strict';

var request = require('superagent');
var Q = require('q');

module.exports = function () {
    var service = {};

    service.compile = function (objects, errors) {
        objects.forEach(function (obj) {
            var config = obj.propertyValue('mailgun');
            if (config) {
                service.config = config;
            }
        });
    };

    service.sendMessage = function (data) {
        var future = Q.defer();
        request.
            post('https://api.mailgun.net/v3/' + data.domain + '/messages').
            send(data.message).
            auth('api', data.key).
            type('form').
            end(function (err, result) {
                if (err) {
                    future.reject(err);
                } else {
                    future.resolve(result);
                }
            });
        return future.promise;
    };

    return service;
};