var _ = require('underscore');
var Q = require('q');
var marked = require('marked');
var path = require('path');
var fs = require('fs');

module.exports = function (repositoryService) {
    var service = {};

    service.views = {};

    var viewRenderers = {
        'docs': function (viewConfig) {
            return repositoryService.loadFileFromRepo(viewConfig.fileName).then(function (fileContent) {
                var tableOfContents = [];
                var addItemStack = [];

                function addItem(level, array) {
                    return function (item) {
                        if (item.level == level) {
                            array.push(item);
                        } else if (item.level > level) {
                            if (array.length === 0) {
                                array.push({level: level})
                            }
                            var lastElem = array[array.length - 1];
                            lastElem.children = lastElem.children || [];
                            addItemStack.push(addItem(item.level, lastElem.children));
                            addItemStack[addItemStack.length - 1](item);
                        } else {
                            addItemStack.pop();
                            addItemStack[addItemStack.length - 1](item);
                        }
                    }
                }

                addItemStack.push(addItem(1, tableOfContents));

                var renderer = new marked.Renderer();
                var superHeading = renderer.heading;
                renderer.heading = function (text, level, raw) {
                    addItemStack[addItemStack.length - 1]({level: level, text: text, anchor: raw.toLowerCase().replace(/[^\w]+/g, '-')});
                    return '<a class="shifted-anchor" id="'
                        + this.options.headerPrefix
                        + raw.toLowerCase().replace(/[^\w]+/g, '-')
                        + '"></a><h'
                        + level
                        + '>'
                        + text
                        + '</h'
                        + level
                        + '>\n';
                };
                marked.setOptions({renderer: renderer});
                var compiled = marked(fileContent);

                return {
                    render: function (req, res, next) {
                        res.locals.tableOfContents = tableOfContents;
                        res.locals.docsContent = compiled;
                        _.extend(res.locals, viewConfig.locals);
                        res.render(viewConfig.view);
                    }
                }
            });
        }
    };

    service.compile = function (objects, errors) {
        return Q.all(objects.map(function (obj) {
            var views = obj.propertyValue('customViews');
            if (views) {
                var urlPathToViewConfig = views.evaluateProperties();
                return Q.all(_.map(urlPathToViewConfig, function (config, urlPath) {
                    var viewName = _.isString(config) ? config : config.view;
                    if (!viewName) {
                        errors.error('View is undefined for custom view "%s": "%s"', urlPath, JSON.stringify(config));
                        return undefined;
                    }
                })).then(function () {
                    _.forEach(urlPathToViewConfig, function (config, urlPath) {
                        if (_.isString(config)) {
                            urlPathToViewConfig[urlPath] = {
                                view: config
                            }
                        }
                        urlPathToViewConfig[urlPath].renderer = Q(
                            viewRenderers[urlPathToViewConfig[urlPath].view] && viewRenderers[urlPathToViewConfig[urlPath].view](urlPathToViewConfig[urlPath]) ||
                            {
                                render: function (req, res, next) {
                                    _.extend(res.locals, urlPathToViewConfig[urlPath].locals);
                                    res.render(urlPathToViewConfig[urlPath].view)
                                }
                            }
                        );
                    });
                    _.extend(service.views, urlPathToViewConfig);
                })
            }
            return undefined;
        }))
    };

    return service;
};