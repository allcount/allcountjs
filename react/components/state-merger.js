import _ from 'underscore';
import update from 'react-addons-update';

module.exports = () => {
    class StateMerger {
        constructor (component, statePath) {
            this.component = component;
            this.statePath = statePath;
            this.statePathArray = _.isArray(this.statePath) ? this.statePath : this.statePath.split('.');
        }

        state () {
            return this.getState(this.component.state);
        }

        initWithInitialState (state, initial) {
            return this.mergeState(state, initial);
        }

        setState (updatedState) {
            this.component.setState((state) => this.mergeState(state, updatedState));
        }

        mergeState (state, updatedState) {
            return update(state, this.getUpdateCommand(_.isFunction(updatedState) ? updatedState(this.getState(state)) : updatedState));
        }

        getUpdateCommand(value, path) {
            path = path || this.pathArray();
            if (!path.length) {
                return {$merge: value};
            }
            return { [path[0]]: this.getUpdateCommand(value, _.drop(path)) }
        }

        getState (state, path) {
            path = path || this.pathArray();
            if (!path.length) {
                return state;
            }
            var key = _.isArray(state) ? parseInt(path[0]) : path[0];
            return state[key] && this.getState(state[key], _.drop(path));
        }

        pathArray () {
            return this.statePathArray;
        }

        nestedState (path) {
            return new StateMerger(this.component, _.union(this.statePathArray, _.isArray(path) ? path : [path]));
        }
    }

    return StateMerger;
};