import React from 'react';
import {Grid, Row, Col} from 'react-bootstrap';
import {Link} from 'react-router';

module.exports = (MainPage, menuService) => React.createClass({
    render: function () {
        return <MainPage>
            <div className="splash">
                <Grid>
                    <Row>
                        <Col>
                            <span className="app-logo">
                                <i className={"fa fa-" + (menuService.appIcon() || 'circle-thin') + " fa-fw"}/>
                            </span>
                            <h1>{menuService.appName()}</h1>
                        </Col>
                    </Row>
                </Grid>
            </div>
            <div className="dashboard">
                <Grid>
                    {menuService.menus().map((menuItem) => <Row>
                        <h2>
                            <i className={"fa fa-" + (menuItem.icon || 'circle-thin') + " fa-fw"}/>
                            <Link to={menuItem.url}>{menuItem.name}</Link>
                        </h2>
                        {(menuItem.children || []).map((childItem) => <Col lg="4" sm="6">
                            <h3>
                                <i className={"fa fa-" + (childItem.icon || 'circle-thin') + " fa-fw"}/>
                                <Link to={childItem.url}>{childItem.name}</Link>
                            </h3>
                        </Col>)}
                    </Row>)}
                </Grid>
            </div>
        </MainPage>
    }
});