import React from 'react';

module.exports = () => React.createClass({
    render: function () {
        return <div className={!this.props.withoutHeader ? 'toolbar-header' : ''}>
            {this.props.children}
        </div>
    }
});