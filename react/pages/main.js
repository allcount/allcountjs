import React from 'react';

module.exports = (TopMenu, injection) => React.createClass({
    render: function () {
        return <div>
            <TopMenu
                menuItems={injection.inject('menuService').menus()}
                appName={injection.inject('menuService').appName()}
            />
            {this.props.children}
        </div>
    }
});