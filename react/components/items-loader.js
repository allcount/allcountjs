import _ from 'underscore';

module.exports = (Crud, StateMerger) => {
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
            return this.loadItems({paging});
        }

        refresh () {
            return this.loadCount().then((count) => {
                var start = Math.max(0, Math.min(this.paging().start, count - 1));
                return this.updatePaging({
                    start: start,
                    count: Math.min(this.pageSize(), count - start)
                })
            });
        }

        reload () {
            return this.loadCount().then((count) => this.updatePaging({
                start: 0,
                count: Math.min(this.pageSize(), count)
            }))
        }

        loadItems (newState) {
            newState = Object.assign({}, this.state(), newState);
            return this.entityCrud().find(newState.filtering, newState.paging.start, newState.count).then((items) => {
                this.setState({items});
            })
        }

        loadCount () {
            return this.entityCrud().findCount(this.state().filtering).then((count) => {
                this.setState({count});
                return count;
            })
        }

        entityCrud () {
            return Crud.crudFor(this.entityCrudId);
        }

        models () {
            return this.state().items && this.state().items.map((item, index) =>
                new StateMerger(this.component, _.union(this.statePathArray, ['items', index]))
            )
        }

        pages () {
            var pages = [];
            for (
                var i = Math.max(this.paging().start - this.numPages() * this.pageSize(), 0);
                i < Math.min(this.paging().start + this.numPages() * this.pageSize(), this.state().count);
                i += this.pageSize()
            ) {
                pages.push({start: i, count: Math.min(this.state().count - i, this.pageSize())});
            }
            return pages;
        }

        pageSize () {
            return this.state().pageSize || 25;
        }

        numPages () {
            return this.state().numPages || 10;
        }

        paging () {
            return this.state().paging;
        }

        setCurrentPage (page) {
            return this.updatePaging(page);
        }

        prevPage () {
            var nextStart = Math.max(this.paging().start - this.pageSize(), 0);
            this.setCurrentPage({
                start: nextStart,
                count: Math.min(this.state().count - nextStart, this.pageSize())
            })
        }

        hasPrevPage () {
            return this.paging() && this.paging().start - this.pageSize() >= 0;
        }

        nextPage () {
            var nextStart = Math.min(this.paging().start + this.pageSize(), this.state().count);
            this.setCurrentPage({
                start: nextStart,
                count: Math.min(this.state().count - nextStart, this.pageSize())
            })
        }

        hasNextPage () {
            return this.paging() && this.paging().start + this.pageSize() < this.state().count;
        }
    }

    return ItemsLoader;
};