import React from 'react';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';

module.exports = (messages) => React.createClass({
    render: function () {
        return <OverlayTrigger placement="bottom" overlay={this.tooltip()}>
            {this.props.children}
        </OverlayTrigger>
    },
    tooltip: function () {
        return <Tooltip>{messages(this.props.message)}</Tooltip>
    }
});