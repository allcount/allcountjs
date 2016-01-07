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
    createButton: function () {
        return <MessageTooltip message="Create">
            <Button bsStyle="success" onClick={this.props.actions.toCreate}><Glyphicon glyph="plus"/></Button>
        </MessageTooltip>
    },
    editGridButton: function () {
        return <MessageTooltip message="Edit">
            <Button onClick={this.props.actions.startGridEditing}><Glyphicon glyph="pencil"/></Button>
        </MessageTooltip>
    },
    doneEditGridButton: function () {
        return <MessageTooltip message="Done">
            <Button onClick={this.props.actions.doneGridEditing}><Glyphicon glyph="ok"/></Button>
        </MessageTooltip>
    },
    doneCreateButton: function () {
        return <MessageTooltip message="Done">
            <Button onClick={this.props.actions.doneCreate}><Glyphicon glyph="ok"/></Button>
        </MessageTooltip>
    },
    backButton: function () {
        return <MessageTooltip message="Back to list">
            <Button onClick={this.props.actions.returnToGrid}><Glyphicon glyph="chevron-left"/></Button>
        </MessageTooltip>
    }
});