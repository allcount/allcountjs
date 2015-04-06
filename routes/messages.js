module.exports = function (messagesService) {
    var route = {};

    route.messagesNgModule = function (req, res) {
        res.send('allcountModule.factory("messagesObj", function () { return ' + JSON.stringify(messagesService.messagesByLocale(req.header('Accept-Language')) || {}) + '});');
    };

    route.messagesObj = function (req, res) {
        res.json(messagesService.messagesByLocale(req.query.lang || req.header('Accept-Language')) || {})
    };

    return route;
};