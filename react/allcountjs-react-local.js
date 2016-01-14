var injection = require('../services/injection-base');
var Q = require('q');

injection.initializeScopedThen(Q);
injection.installModule(require('./local-injection-module'));
injection.installModule(require('./component-module'));
injection.installModule(require('../pouchdb'));

injection.bindFactory('dbUrl', 'hello-world');
injection.bindMultiple('appConfigs', ['evalConfig']);

injection.bindFactory('evalConfig', function (A) {
    A.app({
        appName: "Hello World",
        appIcon: "heart",
        menuItems: [
            {
                name: "Gifts",
                icon: "gift",
                entityTypeId: "Gift"
            }
        ],
        entities: function(Fields) {
            return {
                Gift: {
                    title: 'Gifts',
                    fields: {
                        item: Fields.text("Item"),
                        date: Fields.date("Giving Date")
                    }
                }
            }
        }
    });
});

injection.inject('appService').compile(function (errors) {
    if (errors.length > 0) {
        console.error(errors);
    }
    require('./react-main')(injection);
});

require('../public/assets/less/react-main.less');
