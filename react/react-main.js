import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, Link, hashHistory } from 'react-router'

module.exports = function (injection) {
    var Editor = injection.inject('Editor');
    ReactDOM.render((
        <Editor/>
    ), document.getElementById('content'));
};