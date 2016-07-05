var _ = require('underscore');

module.exports = function (scriptConfigs) {
    return {
        scripts: _.chain(scriptConfigs).map(function (scriptConfig) {
            return _.map(scriptConfig, function (paths, url) {
                return [url, paths];
            })
        }).flatten(true).object().value(),
        concatScripts: function (concatScriptPath) {
            return process.env.NODE_ENV === "production" ? [concatScriptPath] : this.scripts[concatScriptPath];
        }
    }
};