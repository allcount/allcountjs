exports.installModule = (injection) => {
    injection.bindFactory('IndexPage', require('./pages/index'));
    injection.bindFactory('MainPage', require('./pages/main'));
    injection.bindFactory('EntityPage', require('./pages/entity'));
    injection.bindFactory('TopMenu', require('./components/top-menu'));
    injection.bindFactory('Toolbar', require('./components/toolbar'));
    injection.bindFactory('ToolbarContainer', require('./components/toolbar-container'));
    injection.bindFactory('MessageTooltip', require('./components/message-tooltip'));
    injection.bindFactory('DataGrid', require('./components/data-grid'));
    injection.bindFactory('Field', require('./components/field'));
    injection.bindFactory('Model', require('./components/model'));
};