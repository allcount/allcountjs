var vm = require('vm');
var syntaxCheck = require('syntax-error');

module.exports = function (Q, repositoryService, injection, appUtil) {
    return {
        configObjects: function (errorsReport) {
            return repositoryService.configFiles().then(function (files) {
                var objects = [];
                files.forEach(function (file) {
                    var err = syntaxCheck(file.content, file.fileName);
                    if (err) {
                        errorsReport.error(err.toString());
                    } else {
                        try {
                            vm.runInNewContext(file.content, {
                                A: {
                                    app: function (obj) {
                                        objects.push(appUtil.evaluateObject(obj));
                                    }
                                }
                            }, file.fileName);
                        } catch (e) {
                            errorsReport.error(e.stack);
                        }
                    }
                });
                return objects;
            });
        }
    }
};