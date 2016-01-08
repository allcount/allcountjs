import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

module.exports = (MainPage, Toolbar, DataGrid, entityDescriptionService, Model, Form, createReactClass, layoutService) => createReactClass({
    getInitialState: function() {
        return {
            mode: 'list',
            grid: {items: [{id: "1", item: 'bar', date: new Date()}].map((i) => Model.bindToComponent(this, i)), validationErrors: {}},
            isInEditMode: false,
            createForm: {validationErrors: {}, model: Model.bindToComponent(this, {})},
            editForm: {isEditor: false, validationErrors: {}}
        };
    },
    render: function () {
        //TODO promise for fieldDescriptions?
        return <MainPage>
            <Toolbar
                mode={this.state.mode}
                actions={this.toolbarActions()}
                isInEditMode={this.state.isInEditMode}
                permissions={this.permissions()}
                isFormEditing={this.state.editForm.isEditor}
            />
            <div className="container screen-container">
                <ReactCSSTransitionGroup transitionName="transition" transitionEnterTimeout={150} transitionLeaveTimeout={150}>
                    {this.state.mode === 'list' ? <div className="left-animation-screen-transition">{this.list()}</div> : null}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup  transitionName="transition"  transitionEnterTimeout={150} transitionLeaveTimeout={150}>
                    {this.state.mode === 'create' ? <div className="right-animation-screen-transition">{this.createForm()}</div> : null}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup  transitionName="transition"  transitionEnterTimeout={150} transitionLeaveTimeout={150}>
                    {this.state.mode === 'form' ? <div className="right-animation-screen-transition">{this.editForm()}</div> : null}
                </ReactCSSTransitionGroup>
            </div>
        </MainPage>
    },
    list: function () {
        return <DataGrid
            {...this.state.grid}
            isInEditMode={this.state.isInEditMode}
            actions={this.gridActions()}
            permissions={this.permissions()}
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
    editForm: function () {
        return <Form
            fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
            layout={layoutService.layoutFor(this.props.params.entityTypeId)}
            {...this.state.editForm}
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
            returnToGrid: () => {
                this.state.editForm.model = null;
                this.state.editForm.isEditor = false;
                this.setState({mode: 'list', editForm: this.state.editForm});
            },
            startFormEditing: () => {
                this.state.editForm.isEditor = true;
                this.setState({editForm: this.state.editForm});
            },
            doneFormEditing: () => {
                this.state.editForm.isEditor = false;
                this.setState({editForm: this.state.editForm});
            }
        }
    },
    gridActions: function () {
        return {
            navigate: (itemId) => {
                this.state.editForm.model = _.find(this.state.grid.items, (i) => i.id === itemId);
                this.setState({mode: 'form', editForm: this.state.editForm});
            },
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
    permissions: function () {
        return {create: true, read: true, update: true, "delete": true, write: true}; //TODO
    }
});