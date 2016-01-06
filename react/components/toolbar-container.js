import React from 'react';

module.exports = (createReactClass) => createReactClass({
    render: function () {
        return <div className={!this.props.withoutHeader ? 'toolbar-header' : ''}>
            {this.props.children}
        </div>
    }
});