import React from 'react';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';

module.exports = (messages, createReactClass) => createReactClass({
    render: function () {
        return <OverlayTrigger placement="bottom" overlay={this.tooltip()}>
            {this.props.children}
        </OverlayTrigger>
    },
    tooltip: function () {
        return <Tooltip id={this.props.id}>{messages(this.props.message)}</Tooltip>
    }
});