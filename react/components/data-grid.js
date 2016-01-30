import React from 'react';
import {Table, Button, Glyphicon } from 'react-bootstrap';

module.exports = (messages, MessageTooltip, Field, createReactClass) => createReactClass({
    render: function () {
        return <Table>
            <thead>
                <tr>
                    <th key="action-column">
                        <Button bsSize="xs" style={{opacity: '0'}}>
                            <Glyphicon glyph="chevron-right"/>
                        </Button>
                    </th>
                    {this.headers()}
                </tr>
            </thead>
            <tbody>
                {this.rows()}
                {this.createNewRow()}
            </tbody>
            {this.footer()}
        </Table>
    },
    headers: function () {
        return this.props.fieldDescriptions.map((fd) => <th key={'head-' + fd.field} className={this.headerClass(fd)}>{messages(fd.name)}</th>)
    },
    headerClass: function (fd) {
        return fd.fieldTypeId + '-grid-header';
    },
    rows: function () {
        return (this.props.gridItemsLoader.models() || []).map(model => {
            var item = model.state();
            return <tr className="animated-grid-row" key={item.id}>
                <td className="action-grid-cell btn-toolbar">
                    { this.navigateButton(item) }
                    { this.deleteButton(item) }
                    { this.editButton(item) }
                    { this.saveButton(item) }
                </td>
                {this.columns(model)}
            </tr>
        })
    },
    createNewRow: function () {
        return this.props.isInEditMode && this.props.permissions.create ? <tr>
            <td key="create-action-cell" className="action-grid-cell btn-toolbar">
                <MessageTooltip message="Add" id="add-row-tooltip">
                    <Button bsSize="xs" bsStyle="success" onClick={() => this.props.actions.createEntity()}>
                        <Glyphicon glyph="plus"/>
                    </Button>
                </MessageTooltip>
            </td>
            {this.props.fieldDescriptions.map((fd) => <td key={'create-' + fd.field} ng-repeat="fd in fieldDescriptions"></td>)}
        </tr> : null
    },
    footer: function () {
        return !this.props.isInEditMode && this.props.totalRow ? <tfoot>
            <tr className="active">
                <td></td>
                {this.props.fieldDescriptions.map((fd) => <td key={'footer-' + fd.field}>
                    <Field model={this.props.totalRow} isEditor={false} fieldDescription={fd}/>
                </td>)}
            </tr>
        </tfoot> : null
    },
    navigateButton: function (item) {
        return !this.props.isInEditMode && this.props.hasNavigate ? <MessageTooltip message="View" id={"view-tooltip-" + item.id}>
            <Button bsSize="xs" onClick={() => this.props.actions.navigate(item.id)}>
                <Glyphicon glyph="chevron-right"/>
            </Button>
        </MessageTooltip> : null
    },
    deleteButton: function (item) {
        return this.props.isInEditMode && this.props.permissions.delete ? <MessageTooltip message="Delete" id={"delte-tooltip-" + item.id}>
            <Button bsSize="xs" bsStyle="danger" onClick={() => this.props.actions.deleteEntity(item)}>
                <Glyphicon glyph="trash"/>
            </Button>
        </MessageTooltip> : null
    },
    editButton: function (item) {
        return this.props.isInEditMode && this.props.editingItem !== item && this.props.permissions.update ? <MessageTooltip message="Edit" id={"edit-tooltip-" + item.id}>
            <Button bsSize="xs" onClick={() => this.props.actions.editEntity(item)}>
                <Glyphicon glyph="pencil"/>
            </Button>
        </MessageTooltip> : null
    },
    saveButton: function (item) {
        return this.props.isInEditMode && this.props.editingItem === item ? <MessageTooltip message="Save" id={"save-tooltip-" + item.id}>
            <Button bsSize="xs" onClick={() => this.props.actions.saveEntity()}>
                <Glyphicon glyph="ok"/>
            </Button>
        </MessageTooltip> : null
    },
    columns: function (model) {
        var item = model.state();
        return this.props.fieldDescriptions.map((fd) => <td key={'column-' + item.id + '-' + fd.field} className={this.props.validationErrors[fd.field] ? 'has-error' : ''}>
            {this.field(model, fd)}
            {this.props.validationErrors[fd.field] && this.props.editingItem === item ? <div className="text-danger">{messages(this.props.validationErrors[fd.field])}</div> : null}
        </td>)
    },
    field: function (model, fd) {
        return <Field model={model} isEditor={this.props.editingItem === model.state()} fieldDescription={fd}/>
    }
});