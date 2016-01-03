import React from 'react';
import {Navbar, Nav, NavItem, NavDropdown, MenuItem} from 'react-bootstrap';
import {LinkContainer} from 'react-router-bootstrap';
import {Link} from 'react-router';

module.exports = () => React.createClass({
    render: function () {
        return <Navbar fixedTop>
            <Navbar.Header>
                <Navbar.Brand>
                    <Link to='/'>{this.props.appName}</Link>
                </Navbar.Brand>
            </Navbar.Header>
            <Nav>
                {this.props.menuItems.map((i) => this.menu(true, i))}
            </Nav>
        </Navbar>
    },
    menu: function (isRoot, menuItem) {
        if (menuItem.children && isRoot) {
            return <NavDropdown key={menuItem.name} title={menuItem.name}>
                {menuItem.children.map((i) => this.menu(false, i))}
            </NavDropdown>
        } else {
            return <LinkContainer to={{pathname: menuItem.url}}>{isRoot ?
                <NavItem key={menuItem.name}>{menuItem.name}</NavItem> :
                <MenuItem key={menuItem.name}>{menuItem.name}</MenuItem> }
            </LinkContainer>
        }
    }
});