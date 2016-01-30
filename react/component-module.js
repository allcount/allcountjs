import React from 'react';

exports.installModule = (injection) => {
    injection.bindFactory('createReactClass', () => {
        return (spec) => {
            var cls = React.createClass(spec);
            cls.originalSpec = spec;
            return cls;
        }
    });

    injection.bindFactory('ReactApp', require('./react-app'));
    injection.bindFactory('IndexPage', require('./pages/index'));
    injection.bindFactory('MainPage', require('./pages/main'));
    injection.bindFactory('EntityPage', require('./pages/entity'));
    injection.bindFactory('EntityCreateFormPage', require('./pages/entity-new'));
    injection.bindFactory('EntityFormPage', require('./pages/entity-form'));
    injection.bindFactory('TopMenu', require('./components/top-menu'));
    injection.bindFactory('Toolbar', require('./components/toolbar'));
    injection.bindFactory('ToolbarContainer', require('./components/toolbar-container'));
    injection.bindFactory('MessageTooltip', require('./components/message-tooltip'));
    injection.bindFactory('DataGrid', require('./components/data-grid'));
    injection.bindFactory('Field', require('./components/field'));
    injection.bindFactory('Form', require('./components/form'));
    injection.bindFactory('Layout', require('./components/layout'));
    injection.bindFactory('Paging', require('./components/paging'));
    injection.bindFactory('layoutRenderers', require('./components/layout-renderers'));
    injection.bindFactory('ItemsLoader', require('./components/items-loader'));
    injection.bindFactory('StateMerger', require('./components/state-merger'));
};