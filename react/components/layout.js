import React from 'react';

module.exports = (createReactClass, layoutRenderers) => createReactClass({
    render: function () {
        return this.layoutElement(this.props.layout);
    },
    layoutElement: function (element) {
        if (element.containerId === 'field') {
            return this.props.fieldFn(element.params.field);
        }
        var LayoutElem = layoutRenderers[element.containerId];
        return <LayoutElem {...element.params} key={JSON.stringify(element)}>
            {element.children.map((c) => this.layoutElement(c))}
        </LayoutElem>
    }
});