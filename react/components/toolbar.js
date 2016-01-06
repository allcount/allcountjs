import React from 'react';
import {ButtonToolbar, Button, Grid, Glyphicon} from 'react-bootstrap';

module.exports = (ToolbarContainer, MessageTooltip) => React.createClass({
    componentDidMount: function () {
        if (!this.props.withoutHeader) {
            document.body.className = (document.body.className || '') + ' has-toolbar'; //TODO
        }
    },
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
        return <div className="form-inline">
            <div className="pull-left">
                <ButtonToolbar>
                    <MessageTooltip message="Create">
                        <Button bsStyle="success" onClick={this.props.actions.toCreate}><Glyphicon glyph="plus"/></Button>
                    </MessageTooltip>
                    <MessageTooltip message="Edit">
                        <Button onClick={this.props.actions.startGridEditing}><Glyphicon glyph="pencil"/></Button>
                    </MessageTooltip>
                </ButtonToolbar>
            </div>
        </div>
    }
});