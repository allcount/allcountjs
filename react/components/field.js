import React from 'react';
import {Input} from 'react-bootstrap';

module.exports = (createReactClass) => createReactClass({
    handleChange: function (event) {
        this.props.model.setState(event.target.value);
    },
    render: function () {
        if (this.props.isEditor) {
            return <input type="text" value={this.props.model && this.props.model.state()} onChange={this.handleChange} className="form-control"/>
        } else {
            var state = this.props.model && this.props.model.state();
            return <div className="form-control-static">{state && state.toString()}</div>; //TODO
        }
    }
});