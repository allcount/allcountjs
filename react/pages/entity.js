import React from 'react';

module.exports = (MainPage, Toolbar, DataGrid, entityDescriptionService) => React.createClass({
    getInitialState: function() {
        return {mode: 'list', grid: {items: [{item: 'bar', date: new Date()}], validationErrors: {}}, isInEditMode: false};
    },
    render: function () {
        //TODO promise for fieldDescriptions?
        return <MainPage>
            <Toolbar mode={this.state.mode} actions={this.toolbarActions()}/>
            <div className="container screen-container">
                <DataGrid
                    {...this.state.grid}
                    isInEditMode={this.state.isInEditMode}
                    actions={this.gridActions()}
                    permissions={this.gridPermissions()}
                    fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
                    hasNavigate={true}
                />
            </div>
        </MainPage>
    },
    toolbarActions: function () {
        return {
            toCreate: this.toCreate
        }
    },
    gridActions: function () {
        return {

        }
    },
    gridPermissions: function () {
        return {create: true, read: true, update: true, "delete": true, write: true} //TODO
    },
    toCreate: function() {
        this.setState({mode: 'create'})
    }
});