var fs = require('fs');
var _ = require('underscore');
var path = require('path');

module.exports = function () {
    var messages = {};

    var service = {};

    var appMessages = {};

    var forceLocale;

    service.compile = function(objects, errors) {
        _.chain(objects)
            .map(function (obj) {
                return obj.propertyValue('messages') && obj.propertyValue('messages').evaluateProperties() || {};
            })
            .forEach(function (messagesObj) {
                _.forEach(messagesObj, function (messages, locale) {
                    if (!appMessages[locale]) {
                        appMessages[locale] = {};
                    }
                    _.extend(appMessages[locale], messages);
                });
            });
        objects.forEach(function (obj) {
            if (obj.propertyValue('forceLocale')) {
                forceLocale = obj.stringPropertyValue('forceLocale'); //TODO check format
            }
        })
    };

    service.messagesByLocale = function (acceptLanguageHeader) {
        var locale = service.extractLocale(acceptLanguageHeader);
        var fileSuffix = locale ? '_' + locale.locale : '';
        var localeKey = locale ? locale.locale : 'default';

        if (!messages[localeKey]) {
            if (_.isUndefined(messages[localeKey])) {
                messages[localeKey] = require('../config/locale/messages' + fileSuffix + '.js');
            }
            if (appMessages[localeKey]) {
                if (!messages[localeKey]) {
                    messages[localeKey] = {};
                }
                _.extend(messages[localeKey], appMessages[localeKey]);
            }
        }

        return messages[localeKey];
    };

    service.messages = function (acceptLanguageHeader) {
        var messagesByLocale = service.messagesByLocale(acceptLanguageHeader);
        return function (msg) {
            return messagesByLocale && messagesByLocale[msg] || msg;
        }
    };

    service.extractLocale = function (acceptLanguageHeader) {
        var languages = forceLocale && [forceLocale] || parseAcceptLanguageHeader(acceptLanguageHeader);
        var locale = _.find(languages, function (lang) {
            if (appMessages[lang]) {
                return true;
            } else if (_.isUndefined(messages[lang])) {
                if (fs.existsSync(path.join(__dirname, '../config/locale/messages_' + lang + '.js'))) {
                    return true;
                } else {
                    messages[lang] = false;
                    return false;
                }
            } else {
                return !!messages[lang];
            }
        });
        if (locale) {
            var split = locale.split('-');
            return {
                language: split[0],
                country: split[1],
                locale: locale
            }
        } else {
            return undefined;
        }
    };

    function parseAcceptLanguageHeader(header) {
        var langs = header && header.split(',') || [];
        return langs.map(function (lang) {
            return lang.split(';')[0];
        });
    }

    return service;
};

