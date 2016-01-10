import React from 'react';

module.exports = (entityDescriptionService, layoutService, createReactClass, Form) => createReactClass({
    render: function () {
        return <Form
            fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
            isEditor={true}
            layout={layoutService.layoutFor(this.props.params.entityTypeId)}
            {...this.props.viewState.createForm}
        ></Form>
    }
});