import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

module.exports = (MainPage, Toolbar, DataGrid, entityDescriptionService, Model, Form, createReactClass, layoutService, Crud) => createReactClass({
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
            return {grid: state.grid, createForm: state.createForm} ;
        });
        this.refreshGrid().done();
    },
    refreshGrid: function () {
        return this.entityCrud().find({}).then((items) => {
            this.setState((state) => {
                state.grid.items = items.map((i) => Model.bindToComponent(this, i));
                return {grid: state.grid} ;
            });
        })
    },
    entityCrud: function () {
        return Crud.crudFor(this.props.params.entityTypeId);
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
                this.entityCrud().createEntity(this.state.createForm.model).then(() => {
                    this.state.createForm.model = Model.bindToComponent(this, {});
                    this.setState({createForm: this.state.createForm, grid: this.state.grid});
                    return this.refreshGrid().then(() => this.backToList());
                }).done()
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
                this.entityCrud().updateEntity(this.state.editForm.model).then(() => {
                    return this.contextActions().loadFormItem(this.state.editForm.model.id); //TODO move some from contextActions?
                }).then(() => {
                    this.state.editForm.isEditor = false;
                    this.setState({editForm: this.state.editForm});
                    return this.refreshGrid();
                }).done()
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
                this.entityCrud().deleteEntity(item.id).then(() => this.refreshGrid());
            }
        }
    },
    contextActions: function () {
        return {
            loadFormItem: (itemId) => {
                return this.entityCrud().readEntity(itemId).then((item) => {
                    this.setState((state) => {
                        state.editForm.model = Model.bindToComponent(this, item);
                        return {editForm: state.editForm, grid: state.grid};
                    });
                })
            }
        }
    },
    permissions: function () {
        return {create: true, read: true, update: true, "delete": true, write: true}; //TODO
    }
});