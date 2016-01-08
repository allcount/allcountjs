import React from 'react';
import {Table, Button, Glyphicon } from 'react-bootstrap';

module.exports = (messages, MessageTooltip, Field, createReactClass) => createReactClass({
    render: function () {
        return <Table>
            <thead>
                <tr>
                    <th>
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
        return this.props.items.map(item => <tr className="animated-grid-row">
            <td className="action-grid-cell btn-toolbar">
                { this.navigateButton(item) }
                { this.deleteButton(item) }
                { this.editButton(item) }
                { this.saveButton(item) }
            </td>
            {this.columns(item)}
        </tr>)
    },
    createNewRow: function () {
        return this.props.isInEditMode && this.props.permissions.create ? <tr>
            <td className="action-grid-cell btn-toolbar">
                <MessageTooltip message="Add">
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
                {this.props.fieldDescriptions.map((fd) => <td>
                    <Field model={this.props.totalRow} isEditor={false} fieldDescription={fd}/>
                </td>)}
            </tr>
        </tfoot> : null
    },
    navigateButton: function (item) {
        return !this.props.isInEditMode && this.props.hasNavigate ? <MessageTooltip message="View">
            <Button bsSize="xs" onClick={() => this.props.actions.navigate(item.id)}>
                <Glyphicon glyph="chevron-right"/>
            </Button>
        </MessageTooltip> : null
    },
    deleteButton: function (item) {
        return this.props.isInEditMode && this.props.permissions.delete ? <MessageTooltip message="Delete">
            <Button bsSize="xs" bsStyle="danger" onClick={() => this.props.actions.deleteEntity(item)}>
                <Glyphicon glyph="trash"/>
            </Button>
        </MessageTooltip> : null
    },
    editButton: function (item) {
        return this.props.isInEditMode && this.props.editingItem !== item && this.props.permissions.update ? <MessageTooltip message="Edit">
            <Button bsSize="xs" onClick={() => this.props.actions.editEntity(item)}>
                <Glyphicon glyph="pencil"/>
            </Button>
        </MessageTooltip> : null
    },
    saveButton: function (item) {
        return this.props.isInEditMode && this.props.editingItem === item ? <MessageTooltip message="Save">
            <Button bsSize="xs" onClick={() => this.props.actions.saveEntity()}>
                <Glyphicon glyph="ok"/>
            </Button>
        </MessageTooltip> : null
    },
    columns: function (item) {
        return this.props.fieldDescriptions.map((fd) => <td className={this.props.validationErrors[fd.field] ? 'has-error' : ''}>
            <Field model={item} isEditor={this.props.editingItem === item} fieldDescription={fd}/>
            {this.props.validationErrors[fd.field] && this.props.editingItem === item ? <div className="text-danger">{messages(this.props.validationErrors[fd.field])}</div> : null}
        </td>)
    }
});