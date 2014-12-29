var _ = require('underscore');
var Q = require('q');
var marked = require('marked');

module.exports = function (repositoryService) {
    var service = {};

    service.views = {};

    var fileProcessors = {
        'custom-view': function (fileContent) {
            return {customViewContent: fileContent};
        },
        'docs': function (fileContent) {
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
                tableOfContents: tableOfContents,
                docsContent: compiled
            }
        }
    };

    service.compile = function (objects, errors) {
        return Q.all(objects.map(function (obj) {
            var views = obj.propertyValue('customViews');
            if (views) {
                var viewIdToPath = views.evaluateProperties();
                return Q.all(_.map(viewIdToPath, function (config, path) {
                    var fileName = _.isString(config) ? config : config.fileName;
                    if (!fileName) {
                        errors.error('Filename is undefined for custom view "%s": "%s"', path, config);
                        return undefined;
                    }
                    return repositoryService.fileExistsInRepo(fileName).then(function (exists) {
                        if (!exists) {
                            errors.error('View file "%s" for path "%s" not found in repository', fileName, path);
                        }
                    })
                })).then(function () {
                    _.forEach(viewIdToPath, function (config, path) {
                        if (_.isString(config)) {
                            viewIdToPath[path] = {
                                view: 'custom-view',
                                fileName: config
                            }
                        }
                        if (!fileProcessors[viewIdToPath[path].view]) {
                            errors.error("View type '%s' is not supported", viewIdToPath[path].view);
                            return;
                        }
                        viewIdToPath[path].fileProcessor = fileProcessors[viewIdToPath[path].view];
                    });
                    _.extend(service.views, viewIdToPath);
                })
            }
            return undefined;
        }))
    };

    return service;
};