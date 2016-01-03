exports.installModule = (injection) => {
    injection.bindFactory('IndexPage', require('./pages/index'));
    injection.bindFactory('MainPage', require('./pages/main'));
    injection.bindFactory('EntityPage', require('./pages/entity'));
    injection.bindFactory('TopMenu', require('./components/top-menu'));
};