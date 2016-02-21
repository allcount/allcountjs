# AllcountJS as a dependency

To install AllcountJS to your dependencies run `npm install --save allcountjs` from your project directory or declare dependency in `package.json`.
Minimum viable usage setup would look like

```
var injection = require('allcountjs');
injection.bindFactory('port', 9080);
injection.bindFactory('dbUrl', 'mongodb://localhost:27017/helloworld');
injection.bindFactory('gitRepoUrl', 'https://github.com/foo/bar.git');
var server = injection.inject('allcountServerStartup');
server.startup(function (errors) {
    if (errors) {
        throw new Error(errors.join('\n'));
    }
});
```

`allcountjs` module returns `injection` module instance that should be used to configure your app and then run it.
`injection.inject('allcountServerStartup')` call initializes AllcountJS server and `server.startup()` runs it.
In order to run AllcountJS you should define three config dependencies

- `port` - HTTP port to bind to,
- `dbUrl` - MongoDB url to use,
- `gitRepoUrl` - repository config url or regular directory path where business app configuration resides.

## Setup for project initialized with AllcountJS CLI

If your project was initialized with AllcountJS CLI in order to get control over `injection` configuration you should add `app.js` file in your project directory and put there something like

```
var injection = require('allcountjs');
injection.bindFactory('port', 9080);
injection.bindFactory('dbUrl', 'mongodb://localhost:27017/helloworld');
injection.bindFactory('gitRepoUrl', 'app-config');
var server = injection.inject('allcountServerStartup');
server.startup(function (errors) {
    if (errors) {
        throw new Error(errors.join('\n'));
    }
});
```

> *NOTE*: Please change `dbUrl` to one you already use.

Then run your app with `node app.js` from your project dir.

# Dependency Injection

## Defining dependencies

AllcountJS has it's own [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection) implementation.
Dependencies could be defined using `injection.bindFactory(dependencyName, factoryFn)`.
`factoryFn` is a function that returns dependency instance.
Function argument names are used to resolve required dependencies.
For example
```
injection.bindFactory('fooBar', function (foo, bar) { ... })
```
would define factory for `fooBar` dependency that will require `foo` and `bar` dependency instances.
You could override any AllcountJS dependency until `injection.inject('allcountServerStartup')` call where most of these dependencies are injected and retained until server shutdown.
Each dependency is a singleton so it's instantiated only once in current scope.

## Defining extension points

Extension points in AllcountJS could be defined using `injection.bindMultiple(dependencyName, dependencyNamesArray)`.
Call to this method defines array dependency that will contain all of `dependencyNamesArray` implementations.
For example if you call
```
injection.bindMultiple('nutsNBolts', ['nut', 'bolt']);
injection.bindMultiple('nutsNBolts', ['tool']);
```
you'll get array that consists of `nut`, `bolt` and `tool` instances after requiring `nutsNBolts` dependency.
Note that multiple invocation of `injection.bindMultiple()` for one dependency name will concatenate `dependencyNamesArray` instances.

## Overriding dependencies

Every AllcountJS dependency could be overridden using `injection.overrideFactory(dependencyName, renameOldServiceTo, factoryFn)`.
Upon `injection.overrideFactory()` call dependency factory with `dependencyName` name is replaced by `factoryFn`.
`renameOldServiceTo` is used to define old factory name within `factoryFn` injection scope.
Typical override would look like

```
injection.overrideFactory('foo', 'oldFoo', function (oldFoo) {
    var someMethodSuper = oldFoo.someMethod;
    oldFoo.someMethod = function () {
        ...
        return someMethodSuper.call(this);
    }
    return oldFoo;
})
```

# Extension points

## Views

AllcountJS by default uses [Jade](http://jade-lang.com/) template engine.
You could add your own view path by defining
```
injection.bindMultiple('viewPaths', ['myViewPathProvider']);
injection.bindFactory('myViewPathProvider', function () {
    return [path.join(__dirname, 'views')];
});
```

`injection.bindMultiple(name, dependencyNamesArray)` is used to define multiple bindings.
`injection.bindMultiple()` could be called multiple times: all `dependencyNamesArray`'s will be concatenated.
`viewPaths` result array will be reversed before lookup: latest bound dependency would be the first in array.
So in case of `viewPaths` binding your path will be searched first.

## Entity Views

You could implement custom entity Jade views for entities to customize entities visualization.
To define custom view you should write configuration code like

```
A.app({
    ...,
    entities: function(Fields) {
        return {
            Tasks: {
                customView: 'tasks-card-view',
                fields: {
                    summary: Fields.text("Summary"),
                    date: Fields.date("Due date"),
                    isComplete: Fields.checkbox("Completed")
                },
                ...
            },
            ...
        }
    }
});
```

Then you could create `tasks-card-view.jade` in your view directory with following content

```
extends main
block vars
    - var hasToolbar = true
block content
    div(ng-app='allcount', ng-controller='EntityViewController')
        .toolbar-header
            .container.form-inline
                .pull-right.form-inline
                    input.form-control(type='text', ng-model='viewState.filtering.textSearch', ng-trim='true', placeholder=messages("entity.search"))
                    span(lc-paging="'" + entityTypeId + "'", paging='viewState.paging', filtering='viewState.filtering')
        .container.screen-container
            .left-animation-screen(lc-list="'" + entityTypeId + "'", filtering='viewState.filtering', ng-show='viewState.paging.count > 0', edit-mode='false', paging='viewState.paging')
                .row
                    .col-xs-3(ng-repeat="item in items")
                        .panel.panel-default
                            .panel-heading {{item.summary}}
                            .panel-body
                                div(ng-repeat="fd in fieldDescriptions", lc-field="fd",ng-model="item[fd.field]", is-editor="false")
            div(ng-show="viewState.paging.count == 0")
                b= messages("entity.noRecords")
    script(src='/assets/js/views/entity.js')
```

Note that you could combine various AngularJS directives provided by AllcountJS.
Most of AllcountJS directives accept `entityTypeId` identifier that passed to your view as local.

## Overriding form layout

There are many Jade mixins you could override and take control over specific parts of page rendering. For example you could override `defaultFormTemplate()` mixin to get an ability to customize form layout and field rendering of standard `entity.jade` as follows:

```jade
extends main
include mixins

block vars
    - var hasToolbar = true
    
    mixin defaultFormTemplate()
        .row
          .col-md-6
            +fieldGroup('dealNumber')
            +fieldGroup('status')
            +fieldGroup('employee')
          .col-md-6  
            +fieldGroup('taskDate')
            +fieldGroup('isRejected')
            +fieldGroup('rejectCause’)
            
block content
    div(ng-app='allcount', ng-controller='EntityViewController')
        +defaultToolbar()
        .container.screen-container(ng-cloak)
            +defaultGrid()
            +noEntries()
            +defaultEditAndCreateForms()

block js
    +entityJs()
        
```        

## Overriding default templates

When `viewPaths` is set AllcountJS will check for templates according to reversed array priority.
For example if you define `viewPaths` and create `main.jade` in your view directory then main application template will be used from yours view directory and not from default.

## Theming and serving assets

AllcountJS provides a way to tweak your application theme flawlessly.
It uses [Twitter Bootstrap](http://getbootstrap.com/) to build look & feel and [LESS middleware](https://github.com/emberfeather/less.js-middleware) to compile bootstrap themes.
First you'd need to setup your asset routes like

```
injection.overrideFactory('assetsSetup', 'prevAssetsSetup', function (prevAssetsSetup) {
    var setupSuper = prevAssetsSetup.setup;
    prevAssetsSetup.setup = function () {
        setupSuper.call(this);
        this.setupPublicPathServing(path.join(__dirname, 'public'), path.join(process.cwd(), 'tmp/my-app-css'));
    };
    return prevAssetsSetup;
});
```

`assetsSetup` is used to configure AllcountJS assets serving.
By overriding it you could define your own rules of assets serving.
It allows you to host your own LESS themes and their assets.
For example typical LESS theme with `'foo'` name should be placed in file named `foo-main.less` in the `public/assets/less` directory and would look like

```
@import "../../../node_modules/allcountjs/public/assets/less/main";
@brand-primary:         #FF9900;
@brand-success:         #99CC00;
@brand-info:            #07938B;
@brand-warning:         #F2DB00;
@brand-danger:          #FF590D;
```

To enable this theme in your app you should configure it as

```
A.app({
    theme: 'foo'
})
```

## Routes

AllcountJS provides extension points to define your own express routes as follows

```
injection.bindFactory('myAppConfig', function (app, appAccessRouter, express) {
    return {
        configure: function () {
            appAccessRouter.get('/foo/bar', function (req, res, next) {
                res.render('my-view');
            });
        }
    }
});
injection.bindMultiple('appConfigurators', [
    'myAppConfig'
]);
```

`appAccessRouter` is a secured router that checks user authentication if it's required.

## API services

You could define your own API services that could be used in app configuration JS.
Any dependency which name starts with uppercase letter would be available as API service.
For example dependency
```
injection.bindFactory('FooBar', function () {
    return {
        ...
    }
});
```
could be required in app configuration JS as follows
```js
A.app({
  ...,
  entities: function(FooBar, Fields) {
    return {
      ...
    }
  }
});
```

### Mongoose integration

You could access database directly using [mongoose](http://mongoosejs.com/).
For example you could implement custom API services that updates `isCompleted` flag for tasks:

> *NOTE:* Although you can update database using mongoose, preferred way is to use `crudService` instead to trigger all necessary db updates like update of text search indexes, computed field evaluation, etc.

```
module.exports = function (storageDriver) {
    var connection = storageDriver.mongooseConnection();
    return {
        finishTask: function (taskId) {
            var Tasks = connection.model('Tasks');
            return Tasks.findByIdAndUpdate(taskId, {isCompleted: true}).exec();
        }
    }
};
```

You should bind it with `injection.bindFactory('TaskManager', require('./task-manager'))`.
After that you could use it for example in one of your actions:

```
A.app({
    ...,
    entities: function(Fields) {
        return {
            Tasks: {
                ...,
                actions: [
                    {
                        id: 'complete',
                        name: 'Complete',
                        actionTarget: 'single-item',
                        perform: function (Actions, TaskManager) {
                            return TaskManager.finishTask(Actions.selectedEntityId()).then(function () {
                                return Actions.refreshResult();
                            });
                        }
                    }
                ]
            }
        }
    }
});
```

## Compile services

AllcountJS allows you to define your own app configuration processing.
To do it you should define `compileServices`
```
injection.bindMultiple('compileServices', [
    'myFooService'
]);
injection.bindFactory('myFooService', function () {
    return {
        compile: function (objects, errors) {
            var service = this;
            objects.forEach(function (obj) {
                var fooBar = obj.propertyValue('fooBar');
                if (fooBar) {
                    service.fooBar = fooBar;
                }
            });
        }
    }
})
```

# REST API

AllcountJS provides JSON REST API to perform all operations available to users including entity query, create, update, delete as well as utility operations to load entity descriptions.
There is a brief cheat sheet for these APIs:

* `POST` `/api/sign-up` - Sign up user if available. Expects `{ "username": "...", "password": "..."}` body.
* `POST` `/api/sign-in` - Sign in user. Expects `{ "username": "...", "password": "..."}` body. Returns access token in format `{token: "..."}`. This token should be passed in `X-Access-Token` header for all requests requiring authentication.
* `GET` `/api/entity/:entityTypeId/count` - Get entity count for `entityTypeId`. You could pass filtering param described below. Returns `{ count: ...}` object.
* `GET` `/api/entity/:entityTypeId` - Load entities `entityTypeId`. You could pass filtering param described below. Returns array of entities.
* `POST` `/api/entity/:entityTypeId` - Create entity for `entityTypeId`. Expects entity object body.
* `GET` `/api/entity/:entityTypeId/:entityId` - Read entity for `entityTypeId` by it's `entityId`. Returns entity object.
* `PUT` `/api/entity/:entityTypeId` - Update entity for `entityTypeId`. Expects entity object body with defined `id` field.
* `DELETE` `/api/entity/:entityTypeId/:entityId` - Delete entity for `entityTypeId` by it's `entityId`.

* `GET` `/api/entity/:entityTypeId/reference-values` - Load reference values for `entityTypeId` in `{id: "...", name: "..."}` format as it saved in reference fields.
* `GET` `/api/entity/:entityTypeId/reference-values/:entityId` - Load reference value for `entityTypeId` by `entityId`.

* `GET` `/api/entity/:entityTypeId/layout` - Load layout definition for `entityTypeId`.
* `GET` `/api/entity/:entityTypeId/entity-description` - Load title and reference name for `entityTypeId` in format `{title: ..., referenceNameExpression: ...}`.
* `GET` `/api/entity/:entityTypeId/field-descriptions` - Load field descriptions for `entityTypeId`.
* `POST` `/api/entity/:entityTypeId/actions/:actionId` - Perform action with `actionId` identifier for `entityTypeId`.
* `GET` `/api/entity/:entityTypeId/actions` - Load available actions for `entityTypeId`.

* `GET` `/api/file/download/:fileId` - Download file by `fileId`.
* `POST` `/api/file/upload` - Upload file and get it's `fileId`.
* `GET` `/api/menus` - Get app menu array for current user.
* `GET` `/api/app-info` - Get app global properties such as `appName`.

For query and count operations you could pass filtering query param. It should be encoded as JSON string, for example

```GET /api/entity/Students?filtering={"textSearch": "John"}```

Filtering object has following format:

* `textSearch` - textual search query.
* `filtering` - CRUD filtering object.
* `sorting` - CRUD sorting object. Not applied for count operation.

Example:

```$scope.viewState.filtering = {filtering: {parent: {id: null}}}```

Query operation also supports `start` and `count` query params to perform paging.
