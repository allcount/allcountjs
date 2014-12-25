var jade = require('jade');
var _ = require('underscore');
var fs = require('fs');
var viewLookupCache = {};
var p = require('path');

module.exports = function (viewPaths) {
    var Parser = jade.Parser;
    var paths = _.flatten(viewPaths);

    function AllcountJadeParser() {
        Parser.prototype.constructor.apply(this, arguments);
    }

    AllcountJadeParser.prototype = _.extend(_.clone(Parser.prototype), {
        resolvePath: function (path, purpose) {
            if ('.jade' != path.substr(-5)) path += '.jade';
            if (!_.isUndefined(viewLookupCache[path])) {
                return viewLookupCache[path];
            }
            var viewPath = _.find(paths, function (viewPath) {
                return fs.existsSync(p.join(viewPath, path)); //TODO get rid of
            });
            if (viewPath) {
                var result = p.join(viewPath, path);
                viewLookupCache[path] = result;
                return result;
            } else {
                viewLookupCache[path] = null;
            }
            return Parser.prototype.resolvePath.apply(this, arguments);
        }
    });

    return AllcountJadeParser;
};