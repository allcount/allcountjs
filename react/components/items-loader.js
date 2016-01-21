import _ from 'underscore';

module.exports = (Crud, StateMerger, Model) => {
    class ItemsLoader extends StateMerger {
        constructor (component, entityCrudId, stateProperty) {
            super(component, stateProperty);
            this.entityCrudId = entityCrudId;
        }

        setInitialState (state) {
            return this.initWithInitialState(state, {paging: {}, filtering: {}});
        }

        updatePaging (paging) {
            this.setState({paging});
            return this.loadItems();
        }

        loadItems () {
            return this.entityCrud().find(this.state().filtering, this.state().paging.start, this.state().paging.count).then((items) => {
                this.setState({items});
            })
        }

        loadCount () {
            return this.entityCrud().findCount(this.state().filtering).then((count) => {
                this.setState({count});
            })
        }

        entityCrud () {
            return Crud.crudFor(this.entityCrudId);
        }

        models () {
            return this.state().items && this.state().items.map((item, index) => new Model(this.component, _.union(this.statePathArray, ['items', index])))
        }
    }

    return ItemsLoader;
};