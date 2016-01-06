import React from 'react';
import {Input} from 'react-bootstrap';

module.exports = () => React.createClass({
    handleChange: function (event) {
        this.props.model.setValue(this.props.fieldDescription.field, event.target.value);
    },
    render: function () {
        if (this.props.isEditor) {
            return <input type="text" value={this.props.model[this.props.fieldDescription.field]} onChange={this.handleChange} className="form-control"/>
        } else {
            return <div className="form-control-static">{this.props.model[this.props.fieldDescription.field] && this.props.model[this.props.fieldDescription.field].toString()}</div>; //TODO
        }
    }
});