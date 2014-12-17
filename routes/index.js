module.exports = function (templateVarService) {
    var routes = {};

    routes.index = function(req, res){
        templateVarService.setupLocals(req, res);
        res.render('index');
    };

    return routes;
};