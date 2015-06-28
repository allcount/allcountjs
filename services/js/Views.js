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

function ViewBuilder(view) {
    this.view = view;
}

ViewBuilder.prototype = {
    permitRoles: function (roles) {
        this.permissions = roles;
        return this;
    }
};

exports.view = function (view) {
    return new ViewBuilder(view);
};