import React from 'react';
import {ButtonToolbar, Button, Grid, Glyphicon} from 'react-bootstrap';
import BodyClassName from 'react-body-classname';

module.exports = (ToolbarContainer, MessageTooltip, createReactClass) => createReactClass({
    render: function () {
        return <ToolbarContainer withoutHeader={this.props.withoutHeader}>
            <BodyClassName className="has-toolbar">
                <Grid>
                { this.switchMode() }
                </Grid>
            </BodyClassName>
        </ToolbarContainer>
    },
    switchMode: function () {
        switch(this.props.mode) {
            case 'list':
                return this.listContainer();
            case 'create':
                return this.createContainer();
            case 'form':
                return this.formContainer();
        }
    },
    listContainer: function () {
        return <div className="form-inline">
            <div className="pull-left">
                <ButtonToolbar>
                    {this.props.isInEditMode ? this.doneEditGridButton() : [this.createButton(), this.editGridButton()]}
                </ButtonToolbar>
            </div>
        </div>
    },
    createContainer: function () {
        return <ButtonToolbar>
            {this.backButton()}
            {this.doneCreateButton()}
        </ButtonToolbar>
    },
    formContainer: function () {
        return <ButtonToolbar>
            {this.backButton()}
            {this.props.isFormEditing ? this.doneFormEditingButton() : this.startFormEditingButton()}
        </ButtonToolbar>
    },
    createButton: function () {
        //TODO permissions
        return <MessageTooltip message="Create" key="Create" id="create-tooltip">
            <Button bsStyle="success" onClick={this.props.actions.toCreate}><Glyphicon glyph="plus"/></Button>
        </MessageTooltip>
    },
    editGridButton: function () {
        return <MessageTooltip message="Edit" key="EditGrid" id="edit-grid-tooltip">
            <Button onClick={this.props.actions.startGridEditing}><Glyphicon glyph="pencil"/></Button>
        </MessageTooltip>
    },
    doneEditGridButton: function () {
        return <MessageTooltip message="Done" key="DoneGrid" id="done-grid-tooltip">
            <Button onClick={this.props.actions.doneGridEditing}><Glyphicon glyph="ok"/></Button>
        </MessageTooltip>
    },
    doneCreateButton: function () {
        return <MessageTooltip message="Done" key="DoneCreate" id="done-create-tooltip">
            <Button onClick={this.props.actions.doneCreate}><Glyphicon glyph="ok"/></Button>
        </MessageTooltip>
    },
    startFormEditingButton: function () {
        return <MessageTooltip message="Edit" key="EditForm" id="edit-form-tooltip">
            <Button onClick={this.props.actions.startFormEditing}><Glyphicon glyph="pencil"/></Button>
        </MessageTooltip>
    },
    doneFormEditingButton: function () {
        return <MessageTooltip message="Done" key="DoneForm" id="done-form-tooltip">
            <Button onClick={this.props.actions.doneFormEditing}><Glyphicon glyph="ok"/></Button>
        </MessageTooltip>
    },
    backButton: function () {
        return <MessageTooltip message="Back to list" key="Back" id="back-tooltip">
            <Button onClick={this.props.actions.returnToGrid}><Glyphicon glyph="chevron-left"/></Button>
        </MessageTooltip>
    }
});