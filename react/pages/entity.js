import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

module.exports = (MainPage, Toolbar, DataGrid, entityDescriptionService, Model, Form, createReactClass, layoutService) => createReactClass({
    getInitialState: function() {
        return {
            mode: 'list',
            grid: {items: [{item: 'bar', date: new Date()}].map((i) => Model.bindToComponent(this, i)), validationErrors: {}},
            isInEditMode: false,
            createForm: {validationErrors: {}, model: Model.bindToComponent(this, {})}
        };
    },
    render: function () {
        //TODO promise for fieldDescriptions?
        return <MainPage>
            <Toolbar mode={this.state.mode} actions={this.toolbarActions()} isInEditMode={this.state.isInEditMode}/>
            <div className="container screen-container">
                <ReactCSSTransitionGroup transitionName="transition" transitionEnterTimeout={150} transitionLeaveTimeout={150}>
                    {this.state.mode === 'list' ? <div className="left-animation-screen-transition">{this.list()}</div> : null}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup  transitionName="transition"  transitionEnterTimeout={150} transitionLeaveTimeout={150}>
                    {this.state.mode === 'create' ? <div className="right-animation-screen-transition">{this.createForm()}</div> : null}
                </ReactCSSTransitionGroup>
            </div>
        </MainPage>
    },
    list: function () {
        return <DataGrid
            {...this.state.grid}
            isInEditMode={this.state.isInEditMode}
            actions={this.gridActions()}
            permissions={this.gridPermissions()}
            fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
            hasNavigate={true}
            editingItem={this.state.gridEditingItem}
        />
    },
    createForm: function () {
        return <Form
            fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
            isEditor={true}
            layout={layoutService.layoutFor(this.props.params.entityTypeId)}
            {...this.state.createForm}
        ></Form>
    },
    toolbarActions: function () {
        return {
            toCreate: () => this.setState({mode: 'create'}),
            startGridEditing: () => this.setState({isInEditMode: true}),
            doneGridEditing: () => this.setState({isInEditMode: false}),
            doneCreate: () => {
                this.state.grid.items.push(this.state.createForm.model);
                this.state.createForm.model = Model.bindToComponent(this, {});
                this.setState({mode: 'list', createForm: this.state.createForm, grid: this.state.grid});
            },
            returnToGrid: () => this.setState({mode: 'list'})
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