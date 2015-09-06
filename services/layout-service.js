var _ = require('underscore');

module.exports = function (entityDescriptionService, appUtil) {
    var entityTypeIdToLayout = {};
    return {
        compile: function () {
            var self = this;
            _.forEach(entityDescriptionService.entityDescriptions, function (description, entityTypeId) {
                entityTypeIdToLayout[entityTypeId] = description.layout && self.compileLayout(description.layout);
            })
        },
        compileLayout: function (layout) {
            function isContainer(id) {
                return id.match(/^[A-Z]\w*$/);
            }
            var self = this;
            if (_.isString(layout)) {
                return self.fieldContainer(layout);
            } else {
                var containerId = null;
                _.forEach(layout, function (value, id) {
                    if (isContainer(id)) {
                        if (containerId) {
                            throw new appUtil.CompileError("Only one container id expected in " + JSON.stringify(layout));
                        }
                        containerId = id;
                    }
                });
                if (!containerId) {
                    throw new appUtil.CompileError("Expected container property in " + JSON.stringify(layout));
                }
                if (!_.isArray(layout[containerId])) {
                    throw new appUtil.CompileError("Array expected as container property in " + JSON.stringify(layout));
                }
                return self.container(
                    containerId,
                    layout[containerId].map(self.compileLayout.bind(self)),
                    _.chain(layout).map(function (v, k) { return [k, v] }).filter(function (p) { return !isContainer(p[0])}).object().value()
                );
            }
        },
        prepareDefaultLayout: function (description, entityTypeId) {
            var self = this;
            var descriptionsWithoutRelations = _.filter(entityDescriptionService.fieldDescriptions({entityTypeId: entityTypeId}), function (desc) {
                return desc.fieldType.id != 'relation';
            });
            var relationDescriptions = _.filter(entityDescriptionService.fieldDescriptions({entityTypeId: entityTypeId}), function (desc) {
                return desc.fieldType.id == 'relation';
            });
            var height = Math.ceil(descriptionsWithoutRelations.length / 2);

            function fieldContainer(d) {
                return self.fieldContainer(d.field);
            }
            var formContainer = self.container('H', [
                self.container('V', _.chain(descriptionsWithoutRelations).take(height).map(fieldContainer).value()),
                self.container('V', _.chain(descriptionsWithoutRelations).drop(height).map(fieldContainer).value())
            ]);
            var tabContainer = self.container('Tabs', relationDescriptions.map(function (d) { return self.container('V', [fieldContainer(d)], {title: d.name}); }));
            var resultingContainer = [formContainer];
            if (!_.isEmpty(relationDescriptions)) {
                resultingContainer.push(tabContainer);
            }
            return self.container('V', resultingContainer);
        },
        fieldContainer: function (field) {
            return this.container('field', undefined, {field: field})
        },
        container: function (id, children, params) {
            return {
                containerId: id,
                children: children,
                params: _.size(params) && params || undefined
            }
        },
        layoutFor: function (entityTypeId) {
            return entityTypeIdToLayout[entityTypeId] || this.prepareDefaultLayout(entityDescriptionService.entityDescription(entityDescriptionService.entityTypeIdCrudId(entityTypeId)), entityTypeId);
        }
    }


};