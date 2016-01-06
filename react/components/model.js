module.exports = () => {
    return {
        bindToComponent: function (component, modelInstance) {
            var updateState = (model) => {
                component.forceUpdate(); //TODO
            };
            var model = Object.assign(Object.create({
                setValue: function (property, value) {
                    this[property] = value;
                    updateState(this);
                }
            }), modelInstance || {});
            updateState(model);
            return model;
        }
    };
};