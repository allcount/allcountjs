import React from 'react';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';

module.exports = () => React.createClass({
    handleChange: function () {
        this.props.model.setValue(this.props.fieldDescription.field, event.target.value);
    },
    render: function () {
        return <span>{this.props.model[this.props.fieldDescription.field] && this.props.model[this.props.fieldDescription.field].toString()}</span>;//<input type="text" value={this.props.model[this.props.fieldDescription.field]} onChange={this.handleChange} />;
    }
});