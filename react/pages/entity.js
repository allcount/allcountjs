import React from 'react';

module.exports = (MainPage, Toolbar, DataGrid, entityDescriptionService, Model, createReactClass) => createReactClass({
    getInitialState: function() {
        return {mode: 'list', grid: {items: [{item: 'bar', date: new Date()}].map((i) => Model.bindToComponent(this, i)), validationErrors: {}}, isInEditMode: false};
    },
    render: function () {
        //TODO promise for fieldDescriptions?
        return <MainPage>
            <Toolbar mode={this.state.mode} actions={this.toolbarActions()} isInEditMode={this.state.isInEditMode}/>
            <div className="container screen-container">
                <DataGrid
                    {...this.state.grid}
                    isInEditMode={this.state.isInEditMode}
                    actions={this.gridActions()}
                    permissions={this.gridPermissions()}
                    fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
                    hasNavigate={true}
                    editingItem={this.state.gridEditingItem}
                />
            </div>
        </MainPage>
    },
    toolbarActions: function () {
        return {
            toCreate: () => this.setState({mode: 'create'}),
            startGridEditing: () => this.setState({isInEditMode: true}),
            doneGridEditing: () => this.setState({isInEditMode: false})
        }
    },
    gridActions: function () {
        return {
            editEntity: (item) => this.setState({gridEditingItem: item}),
            saveEntity: () => this.setState({gridEditingItem: null}),
            createEntity: () => {
                this.setState((state) => {
                    var newItem = Model.bindToComponent(this, {});
                    state.grid.items.push(newItem);
                    return {grid: state.grid, gridEditingItem: newItem};
                })
            },
            deleteEntity: (item) => {
                this.setState((state) => {
                    state.grid.items.splice(state.grid.items.indexOf(item), 1);
                    return {grid: state.grid, gridEditingItem: state.gridEditingItem === item ? null : state.gridEditingItem};
                })
            }
        }
    },
    gridPermissions: function () {
        return {create: true, read: true, update: true, "delete": true, write: true} //TODO
    }
});