import React from 'react';
import Frame from 'react-frame-component';

module.exports = (createReactClass, injection, Fields) => createReactClass({
    getInitialState: function () {
        return {
            appConfig: {
                appName: "Hello World",
                appIcon: "heart",
                menuItems: [
                    {
                        name: "Gifts",
                        icon: "gift",
                        entityTypeId: "Gift"
                    }
                ],
                entities: {
                    Gift: {
                        title: 'Gifts',
                        fields: {
                            item: Fields.text("Item"),
                            date: Fields.date("Giving Date")
                        }
                    }
                }
            }
        }
    },
    componentDidMount: function () {
        var self = this;
        window.updateAppConfig = function (config) {
            self.setState({appConfig: config});
            self.recompile(config);
        };
        window.addEventListener("message", (event) => this.recompile(event.data), false);
        this.recompile(this.state.appConfig);
    },
    recompile: function (appConfig) {
        var self = this;
        injection.providers = {};
        injection.bindFactory('evalConfig', function (A) {
            A.app(appConfig);
        });
        injection.inject('appService').compile(function (errors) {
            if (errors.length > 0) {
                self.setState({errors})
            } else {
                self.setState({appComponent: injection.inject('ReactApp')});
            }
        });
    },
    render: function () {
        return this.app();
    },
    app: function () {
        var self = this;
        var AppComponent = this.state.appComponent;
        if (this.state.errors) {
            return <div>{this.state.errors}</div>;
        }
        return AppComponent ? <AppComponent/> : <div>Loading...</div>;
    }
});