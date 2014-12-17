var _ = require('underscore');

module.exports = function (entityDescriptionService) {
    var route = {};

    route.fieldDescriptions = function (req, res) {
        res.json(entityDescriptionService.fieldDescriptions(req.body.entityCrudId));
    };

    route.permissions = function (req, res) {
        res.json({
            read: entityDescriptionService.userHasReadAccess(req.body.entityCrudId, req.user),
            write: entityDescriptionService.userHasWriteAccess(req.body.entityCrudId, req.user)
        })
    };

    function container(id, children, params) {
        return {
            containerId: id,
            children: children,
            params: params
        }
    }

    route.layout = function (req, res) {
        var descriptionsWithoutRelations = _.filter(entityDescriptionService.fieldDescriptions({entityTypeId: req.params.entityTypeId}), function (desc) {
            return desc.fieldType.id != 'relation';
        });
        var relationDescriptions = _.filter(entityDescriptionService.fieldDescriptions({entityTypeId: req.params.entityTypeId}), function (desc) {
            return desc.fieldType.id == 'relation';
        });
        var height = Math.ceil(descriptionsWithoutRelations.length / 2);
        function fieldContainer(d) {
            return container('field', undefined, {field: d.field})
        }
        var formContainer = container('H', [
            container('V', _.chain(descriptionsWithoutRelations).take(height).map(fieldContainer).value()),
            container('V', _.chain(descriptionsWithoutRelations).drop(height).map(fieldContainer).value())
        ]);
        var tabContainer = container('Tabs', relationDescriptions.map(function (d) { return container('V', [fieldContainer(d)], {title: d.name}); }));
        var resultingContainer = [formContainer];
        if (!_.isEmpty(relationDescriptions)) {
            resultingContainer.push(tabContainer);
        }
        res.json(container('V', resultingContainer));
    };

    return route;
};