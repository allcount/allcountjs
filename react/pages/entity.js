import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

module.exports = (MainPage, Toolbar, DataGrid, entityDescriptionService, Model, Form, createReactClass, layoutService) => createReactClass({
    getInitialState: function() {
        return {
            grid: {items: [], validationErrors: {}},
            isInEditMode: false,
            createForm: {validationErrors: {}, isEditor: true},
            editForm: {isEditor: false, validationErrors: {}}
        };
    },
    componentDidMount: function () {
        this.setState((state) => {
            state.createForm.model = Model.bindToComponent(this, {});
            if (!state.grid.items.length) {
                state.grid.items = this.storageStub();
            }
            return {grid: state.grid, createForm: state.createForm} ;
        });
    },
    storageStub: function () {
        return [{id: "1", item: 'bar', date: new Date()}].map((i) => Model.bindToComponent(this, i))
    },
    getChildContext: function () {
        return {actions: this.contextActions()};
    },
    childContextTypes: {
        actions: React.PropTypes.object
    },
    contextTypes: {
        router: React.PropTypes.object
    },
    render: function () {
        //TODO promise for fieldDescriptions?
        return <MainPage>
            <Toolbar
                mode={this.mode()}
                actions={this.toolbarActions()}
                isInEditMode={this.state.isInEditMode}
                permissions={this.permissions()}
                isFormEditing={this.state.editForm.isEditor}
            />
            <div className="container screen-container">
                <ReactCSSTransitionGroup transitionName="transition" transitionEnterTimeout={150} transitionLeaveTimeout={150}>
                    {!this.props.children ? <div className="left-animation-screen-transition">{this.list()}</div> : null}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup  transitionName="transition"  transitionEnterTimeout={150} transitionLeaveTimeout={150}>
                    {this.props.children ? <div className="right-animation-screen-transition">{React.cloneElement(this.props.children, {viewState: this.state})}</div> : null}
                </ReactCSSTransitionGroup>
            </div>
        </MainPage>
    },
    mode: function () {
        return this.props.location.pathname.indexOf('new') === this.props.location.pathname.length - 3 ? 'create' : ( this.props.params.entityId ? 'form' : 'list');
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
            toCreate: () => {
                this.context.router.push('/entity/' + this.props.params.entityTypeId + '/new');
            },
            startGridEditing: () => this.setState({isInEditMode: true}),
            doneGridEditing: () => this.setState({isInEditMode: false}),
            doneCreate: () => {
                this.state.grid.items.push(this.state.createForm.model);
                this.state.createForm.model = Model.bindToComponent(this, {});
                this.setState({createForm: this.state.createForm, grid: this.state.grid});
                this.backToList();
            },
            returnToGrid: () => {
                this.state.editForm.isEditor = false;
                this.setState({editForm: this.state.editForm});
                this.backToList();
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
    backToList: function () {
        this.context.router.push('/entity/' + this.props.params.entityTypeId);
    },
    gridActions: function () {
        return {
            navigate: (itemId) => {
                this.context.router.push('/entity/' + this.props.params.entityTypeId + '/' + itemId);
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
    contextActions: function () {
        return {
            loadFormItem: (itemId) => {
                this.setState((state) => {
                    if (!state.grid.items.length) {
                        state.grid.items = this.storageStub();
                    }
                    state.editForm.model = _.find(state.grid.items, (i) => i.id === itemId);
                    return {editForm: state.editForm, grid: state.grid};
                });
            }
        }
    },
    permissions: function () {
        return {create: true, read: true, update: true, "delete": true, write: true}; //TODO
    }
});