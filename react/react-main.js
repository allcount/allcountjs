import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, Link, hashHistory } from 'react-router'

module.exports = function (injection) {
    var ReactApp = injection.inject('ReactApp');
    ReactDOM.render((
        <ReactApp/>
    ), document.getElementById('content'));
};