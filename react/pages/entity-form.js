import React from 'react';

module.exports = (entityDescriptionService, layoutService, createReactClass, Form) => createReactClass({
    contextTypes: {
        actions: React.PropTypes.object
    },
    componentDidMount: function () {
        this.context.actions.loadFormItem(this.props.params.entityId);
    },
    render: function () {
        return <Form
            fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
            layout={layoutService.layoutFor(this.props.params.entityTypeId)}
            {...this.props.viewState.editForm}
        ></Form>
    }
});