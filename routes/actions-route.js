module.exports = function (actionService, routeUtil) {
    return {
        actionList: function (req, res) {
            actionService
                .actionListFor(routeUtil.extractEntityCrudId(req), req.query.actionTarget).then(function (actions) { return res.json(actions) }).done();
        },
        performAction: function (req, res) {
            actionService.performAction(routeUtil.extractEntityCrudId(req), req.params.actionId, req.body.selectedItemIds).then(function (actionResult) {
                res.json(actionResult);
            }).done();
        }
    };
};