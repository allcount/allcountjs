var fs = require('fs');
var Q = require('q');
var _ = require('underscore');
var crypto = require('crypto');
var fsExtra = require('fs.extra');
var childProcess = require('child_process');
var url = require('url');

module.exports = function (gitRepoUrl, gitService, halt) {
    var service = {};

    var repositoryDir;

    service.cloneRepo = function (repoUrl, repoDir) {
        return Q.nfcall(childProcess.exec, 'git clone ' + repoUrl + ' ' + repoDir, {cwd: process.cwd, timeout: 30000})
    };

    function convertToPath(fileUrl) {
        return url.parse(fileUrl).path;
    }

    function existsPromise(path) {
        var deferred = Q.defer();
        fs.exists(convertToPath(path), function (exists) {
            deferred.resolve(exists);
        });
        return deferred.promise;
    }

    service.initializeRepository = function () {
        if (repositoryDir) {
            return Q(repositoryDir);
        }
        var hash = crypto.createHash('md5');
        hash.update(gitRepoUrl, 'utf8');
        var repoDir = "tmp" + '/' + hash.digest('hex');
        if (fs.existsSync(repoDir)) {
            fsExtra.rmrfSync(repoDir);
        }
        return service.cloneRepo(gitRepoUrl, repoDir).then(function () {
            repositoryDir = repoDir;
            setInterval(function () {
                gitService.checkForUpdates(process.cwd() + '/' + repositoryDir).then(function (changed) {
                    if (changed) {
                        halt("application repository update");
                    }
                }).done();
            }, 60000);
            return repositoryDir;
        }).catch(function (err) {
            return existsPromise(gitRepoUrl).then(function (exists) {
                if (exists) {
                    console.log('Failed to fetch "' + gitRepoUrl + '". Trying to use as regular directory.');
                    repositoryDir = convertToPath(gitRepoUrl);
                    return repositoryDir;
                } else {
                    throw err;
                }
            })
        })
    };

    service.configFiles = function (callback) {
        service.initializeRepository().then(function (repositoryDir) {
            fs.readdir(repositoryDir, function (err, files) {
                if (err) {
                    throw err; //TODO
                }
                Q.all(files.filter(function (file) {
                        return file.indexOf('.js') === file.length - ".js".length;
                    }).map(function (file) {
                        return Q.nfcall(fs.readFile, repositoryDir + '/' + file, "utf-8").then(function (content) {
                            return {fileName: file, content: content};
                        })
                    })
                ).then(callback).done();
            });
        }).done();
    };

    function checkRepoInitialized() {
        if (!repositoryDir) {
            throw new Error('Repository is not initialized');
        }
    }

    service.loadFileFromRepo = function (fileName) {
        checkRepoInitialized();
        return Q.nfcall(fs.readFile, repositoryDir + '/' + fileName, "utf-8");
    };

    service.fileExistsInRepo = function (fileName) {
        checkRepoInitialized();

        var deferred = Q.defer();
        fs.exists(repositoryDir + '/' + fileName, function (result) {
            deferred.resolve(result);
        });
        return deferred.promise;
    };

    service.repositoryDir = function () {
        checkRepoInitialized();
        return repositoryDir;
    };

    return service;
};