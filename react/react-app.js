import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, Link, hashHistory } from 'react-router'

module.exports = (createReactClass, IndexPage, EntityPage, EntityCreateFormPage, EntityFormPage) => createReactClass({
    render: function () {
        return <Router history={hashHistory}>
            <Route path="/" component={IndexPage}/>
            <Route path="/entity/:entityTypeId" component={EntityPage}>
                <Route path="new" component={EntityCreateFormPage}/>
                <Route path=":entityId" component={EntityFormPage}/>
            </Route>
        </Router>
    }
});