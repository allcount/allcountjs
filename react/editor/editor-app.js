import React from 'react';
import Frame from 'react-frame-component';
import {Button} from 'react-bootstrap';

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
    },
    recompile: function (appConfig) {
        window.frames[0].postMessage(appConfig, "*");
        //window.frames[0].updateAppConfig(appConfig);
    },
    render: function () {
        return <div className="editor-split">
            <div className="editor-panel">{this.panel()}</div>
            <div className="content-panel">
                <iframe src="index.html" allowTransparency="true" frameBorder="0" scrolling="0" width="100%" height="100%"></iframe>
            </div>
        </div>
    },
    panel: function () {
        return <div className="container-fluid">
            <h3>Editor</h3>
            <h4>Fields</h4>
            <ul>
                <li>item</li>
            </ul>
            <Button bsStyle="success" onClick={this.addField}>Add field</Button>
        </div>
    },
    addField: function () {
        this.state.appConfig.entities.Gift.fields.comment = Fields.text("Comment");
        this.setState({appConfig: this.state.appConfig});
        this.recompile(this.state.appConfig);
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