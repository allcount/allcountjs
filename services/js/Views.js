exports.docs = function (docsTitle, docsAddTitle, fileName) {
    return {
        view: 'docs',
        fileName: fileName,
        locals: {
            docsTitle: docsTitle,
            docsAddTitle: docsAddTitle
        }
    }
};