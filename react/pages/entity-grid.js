import React from 'react';

module.exports = (entityDescriptionService, layoutService, createReactClass) => createReactClass({
    render: function () {
        return <Form
            fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
            layout={layoutService.layoutFor(this.props.params.entityTypeId)}
            {...this.props}
        ></Form>
    }
});