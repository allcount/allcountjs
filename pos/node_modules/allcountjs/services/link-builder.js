module.exports = function () {
    return {
        buildLinkTo: function (linkObj) {
            return linkObj.view ? linkObj.view : '/entity/' + linkObj.entityTypeId;
        }
    }
};