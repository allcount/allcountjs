import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

module.exports = (MainPage, Toolbar, DataGrid, entityDescriptionService, StateMerger, Form, createReactClass, layoutService, Crud, ItemsLoader) => createReactClass({
    getInitialState: function() {
        var state = {
            grid: {validationErrors: {}},
            isInEditMode: false,
            createForm: {validationErrors: {}, isEditor: true},
            editForm: {isEditor: false, validationErrors: {}}
        };
        state = this.gridItemsLoader().setInitialState(state);
        return state;
    },
    componentDidMount: function () {
        this.setState((state) => {
            state.createForm.model = {};
            return {createForm: state.createForm} ;
        });
        this.refreshGrid().done();
    },
    refreshGrid: function () {
        return this.gridItemsLoader().loadItems();
    },
    entityCrud: function () {
        return Crud.crudFor(this.props.params.entityTypeId);
    },
    gridItemsLoader: function () {
        return new ItemsLoader(this, this.props.params.entityTypeId, 'grid');
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
                    {this.props.children ? <div className="right-animation-screen-transition">{React.cloneElement(this.props.children, {viewState: this.state, createFormModel: new StateMerger(this, ['createForm', 'model']), editFormModel: new StateMerger(this, ['editForm', 'model'])})}</div> : null}
                </ReactCSSTransitionGroup>
            </div>
        </MainPage>
    },
    mode: function () {
        return this.props.location.pathname.indexOf('new') === this.props.location.pathname.length - 3 ? 'create' : ( this.props.params.entityId ? 'form' : 'list');
    },
    list: function () {
        return <DataGrid
            {...this.gridItemsLoader().state()}
            isInEditMode={this.state.isInEditMode}
            actions={this.gridActions()}
            permissions={this.permissions()}
            fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
            hasNavigate={true}
            editingItem={this.state.gridEditingItem}
            gridItemsLoader={this.gridItemsLoader()}
        />
    },
    createForm: function () {
        return <Form
            fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
            isEditor={true}
            layout={layoutService.layoutFor(this.props.params.entityTypeId)}
            {...this.state.createForm}
            model={new Model(this, ['createForm', 'model'])}
        ></Form>
    },
    editForm: function () {
        return <Form
            fieldDescriptions={entityDescriptionService.fieldDescriptions(this.props.params.entityTypeId)}
            layout={layoutService.layoutFor(this.props.params.entityTypeId)}
            {...this.state.editForm}
            model={new Model(this, ['editForm', 'model'])}
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
                    this.state.createForm.model = {};
                    this.setState({createForm: this.state.createForm});
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
                    var newItem = {};
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
                        state.editForm.model = item;
                        return {editForm: state.editForm};
                    });
                })
            }
        }
    },
    permissions: function () {
        return {create: true, read: true, update: true, "delete": true, write: true}; //TODO
    }
});