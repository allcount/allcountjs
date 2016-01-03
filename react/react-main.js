import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Link, hashHistory } from 'react-router'

module.exports = function (injection) {
    ReactDOM.render((
        <Router history={hashHistory}>
            <Route path="/" component={injection.inject('IndexPage')}/>
            <Route path="/entity/:entityTypeId" component={injection.inject('EntityPage')}/>
        </Router>
    ), document.getElementById('content'));
};