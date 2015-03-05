var nodegit = require('nodegit');
var childProcess = require('child_process');
var Q = require('q');

module.exports = function () {
    var service = {};

    service.checkForUpdates = function (repositoryDir) {
        return getRepositoryHeadSha(repositoryDir).then(function (currentHead) {
            return Q.nfcall(childProcess.exec, 'git pull origin master', {cwd: repositoryDir, timeout: 30000}).then(function () {
                return getRepositoryHeadSha(repositoryDir);
            }).then(function (updatedHead) {
                return currentHead !== updatedHead;
            });
        })
    };

    function getRepositoryHeadSha(repositoryDir) {
        return Q.nfcall(nodegit.Repository.open, repositoryDir + '/.git').then(function (repository) {
            var getMasterCommit = Q.nfbind(repository.getMasterCommit.bind(repository));
            return getMasterCommit().then(function (head) {
                return head.id().toString();
            });
        });
    }

    return service;
};