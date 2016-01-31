import React from 'react';
import ReactDOM from 'react-dom';

var injection = require('../services/injection-base');
var Q = require('q');

injection.initializeScopedThen(Q);
injection.installModule(require('./local-injection-module'));
injection.installModule(require('./component-module'));

injection.bindFactory('EditorApp', require('./editor/editor-app'));

var EditorApp = injection.inject('EditorApp');

ReactDOM.render((
    <EditorApp/>
), document.getElementById('content'));

require('../public/assets/less/react-editor.less');
