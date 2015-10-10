var path = require('path');
var compressor = require('node-minify');
var hashFiles = require('hash-files');

module.exports = function (Q) {
    return {
        scriptHashes: {},
        defaultPublicPath: function () {
            return path.join(__dirname, '..', '..', 'public');
        },
        hashPath: function (url, hash) {
            return url + '-' + hash + '.js';
        },
        buildPath: function () {
            return path.join(process.cwd(), 'build');
        },
        scriptHash: function (url, scriptPaths) {
            var self = this;
            if (self.scriptHashes[url]) {
                return self.scriptHashes[url];
            }
            return self.scriptHashes[url] = Q.nfcall(hashFiles, {files: scriptPaths}).then(function (hash) {
                self.scriptHashes[url] = Q(hash);
                return hash;
            })
        },
        minify: function (scriptPaths, buildScriptPath) {
            var deferred = Q.defer();
            new compressor.minify({
                type: 'uglifyjs',
                fileIn: scriptPaths,
                fileOut: buildScriptPath,
                callback: function(err, min){
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(min);
                    }
                }
            });
            return deferred.promise;
        }
    }
};