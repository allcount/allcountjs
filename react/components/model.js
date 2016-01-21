import _ from 'underscore';

module.exports = (StateMerger) => {
    class Model extends StateMerger {
        constructor (component, statePath) {
            super(component, statePath);
        }

        fieldModel (field) {
            return this.nestedState(field);
        }
    }

    return Model;
};