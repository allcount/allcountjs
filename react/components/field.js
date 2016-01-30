import React from 'react';
import {Input} from 'react-bootstrap';

module.exports = (createReactClass) => createReactClass({
    handleChange: function (event) {
        this.props.model.setState({[this.props.fieldDescription.field]: event.target.value});
    },
    render: function () {
        if (this.props.isEditor) {
            return <input type="text" value={this.props.model && this.props.model.state() && this.props.model.state()[this.props.fieldDescription.field]} onChange={this.handleChange} className="form-control"/>
        } else {
            var state = this.props.model && this.props.model.state() && this.props.model.state()[this.props.fieldDescription.field];
            return <div className="form-control-static">{state && state.toString()}</div>; //TODO
        }
    }
});