module.exports = function (actionService) {
    return {
        actionList: function (req, res) {
            actionService
                .actionListFor(req.body.entityCrudId, req.body.actionTarget).then(function (actions) { return res.json(actions) }).done();
        },
        performAction: function (req, res) {
            actionService.performAction(req.body.entityCrudId, req.body.actionId, req.body.selectedItemIds).then(function (actionResult) {
                res.json(actionResult);
            }).done();
        }
    };
};