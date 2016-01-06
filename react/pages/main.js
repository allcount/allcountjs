import React from 'react';
import BodyClassName from 'react-body-classname';

module.exports = (TopMenu, injection, createReactClass) => createReactClass({
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