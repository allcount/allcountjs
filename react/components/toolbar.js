import React from 'react';
import {ButtonToolbar, Button, Grid, Glyphicon} from 'react-bootstrap';
import BodyClassName from 'react-body-classname';

module.exports = (ToolbarContainer, MessageTooltip) => React.createClass({
    render: function () {
        return <ToolbarContainer withoutHeader={this.props.withoutHeader}>
            <Grid>
            { this.switchMode() }
            </Grid>
        </ToolbarContainer>
    },
    switchMode: function () {
        switch(this.props.mode) {
            case 'list':
                return this.listContainer();
        }
    },
    listContainer: function () {
        return <BodyClassName className="has-toolbar">
            <div className="form-inline">
                <div className="pull-left">
                    <ButtonToolbar>
                        {this.props.isInEditMode ? this.doneEditGridButton() : [this.createButton(), this.editGridButton()]}
                    </ButtonToolbar>
                </div>
            </div>
        </BodyClassName>
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
    }
});