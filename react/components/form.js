import React from 'react';
import classNames from 'classnames';
import _ from 'underscore';

module.exports = (createReactClass, Layout, Field, messages) => createReactClass({
    fieldToDesc: function () {
        return _.object(this.props.fieldDescriptions.map((fd) => [fd.field, fd])); //TODO
    },
    render: function () {
        return <form className={classNames(this.props.formVertical ? 'form' : 'form-horizontal')}>
            { this.layout() }
        </form>
    },
    layout: function () {
        return <Layout layout={this.props.layout} fieldFn={(field) => this.formGroup(field)}/>
    },
    formGroup: function (field) {
        return <div key={field} className={classNames("form-group", {
            'has-warning': false, //TODO this.props.model && this.props.model.isFieldChanged(field),
            'has-error': this.props.validationErrors[field]
        })}>
            {this.label(field)}
            {this.formFieldContainer(field)}
        </div>
    },
    label: function (field) {
        return this.showLabel(field) ? <label className={classNames("control-label", this.props.labelWidthClass || 'col-md-3')}>{this.fieldToDesc()[field].name}</label> : null;
    },
    showLabel: function (field) {
        var fieldToDesc = this.fieldToDesc();
        return fieldToDesc[field] && !fieldToDesc[field].fieldType.removeFormLabel;
    },
    formFieldContainer: function (field) {
        return <div className={!this.showLabel(field) && 'col-xs-12' || this.props.fieldWidthClass || 'col-md-9'}>
            {this.formField(field)}
            {this.formValidationMessage(field)}
        </div>
    },
    formField: function (field) {
        return <Field model={this.props.model && this.props.model.fieldModel(field)} isEditor={this.props.isEditor} fieldDescription={this.fieldToDesc()[field]}/>
    },
    formValidationMessage: function (field) {
        return this.props.validationErrors[field] ? <div className="text-danger">{messages(this.props.validationErrors[field])}</div> : null;
    }
});