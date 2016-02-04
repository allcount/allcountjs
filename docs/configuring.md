# Introduction

This section describes how to configure AllcountJS application.
AllcountJS application configuration consists of multiple JavaScript files placed in Git repository or regular file directory.
These JavaScript files are run by AllcountJS server during startup to configure itself.
AllcountJS configuration object should be passed to `A.app()` method.
It's the only method available in global scope during script execution.
Let's see how Hello World application should look like in AllcountJS.
```js
A.app({
  appName: "Hello World",
  menuItems: [
    {
      name: "Hello world",
      entityTypeId: "HelloWorld",
    }
  ],
  entities: function(Fields) {
    return {
      HelloWorld: {
        fields: {
          foo: Fields.text("Foo"),
          bar: Fields.date("Bar")
        }
      }
    }
  }
});
```
It's a simple Hello World application that would have one `HelloWorld` entity with two fields: text field `foo` and date field `bar`.

## App Config Structure

`A.app()` method receives one argument: app config.
App config is a simple JS object.
Properties of app config could contain primitives, arrays and functions.
In case of function Dependency Injection will be triggered when appropriate app config property is evaluated.

Let's consider following app config
```js
A.app({
  entities: function(Fields) {
    ...
  },
  ...
});
```
Property `entities` is a function.
When `entities` is evaluated argument names of `function (Fields) {...}` are collected and appropriate AllcountJS APIs are injected.
APIs are used to provide access to various AllcountJS features and helpers.
For example `Fields` API is used to define entity fields.

# App Config Properties

## Global Application Properties

There are `appName` and `appIcon` properties that control Application name and icon.
Application icon is showed on application splash screen.
AllcountJS uses font-awesome icons.
You could select appropriate icon at http://fortawesome.github.io/Font-Awesome/icons/.
You should use icon identifier without `fa-` prefix.
For example
```js
A.app({
  appName: "Accounting",
  appIcon: "book",
  ...
});
```

### Authentication

There are two properties that control authentication:

* `onlyAuthenticated` - allows only authenticated users to access application,
* `allowSignUp` - allow users to register new user accounts.

```js
A.app({
  onlyAuthenticated: true,
  allowSignUp: true,
  ...
});
```

### Localization

Strings translation can be defined in `messages` property. 
The more convinient way is to put translation in separate file, and place it next to your application configuration file.
Example of `translations.js`:
```
 A.app({
   messages: {
     ru: {
       "Contact": "Контакт",
       "Phone": "Тел."
     },
     de: {
       "Contact": "Kontakt",
       "Phone": "Telefon"
     }
   }
 });
```
Language selection depends on user browser and OS settings.

Also you can force app localization to particular language. For example:
`forceLocale : "en"`
in global application properties will force AllcountJS always use English language.

> *NOTE*: if you're willing to use `forceLocale` to change AngularJS locale for example to change date format without any actual message localization please add empty locale message object first:

```
A.app({
  messages: {
    ru: {}
  }
});
```

## Menus

Application's menus are defined with `menuItems` property.
It should be an array.
Menus hierarchy could have up to 2 levels.
Menu item object has following structure.
```js
A.app({
  menuItems: [{
    name: "Students",
    icon: "users",
    entityTypeId: "Student"
  }, {
    name: "Misc",
    icon: "list",
    children: [{
      name: "Class types",
      icon: "table",
      entityTypeId: "ClassType"
    }, {
       name: "Postgraduate course types",
       icon: "table",
       entityTypeId: "PostgraduateType"
     }]
  }],
  ...
});
```
`icon` is a font-awesome icon showed on application's splash screen.
Should be used without `fa-` prefix.
Menu item object should have one of `entityTypeId` or `children` properties.
`entityTypeId` should reference one of defined Entity Types.
`children` should contain array of menu item objects.

## Entities

Each application entity type belongs to physical collection or table in database.
Application entity types are defined with `entities` property.
`entities` property should be an object.
Property names of that object are entity type identifiers.
For example `Student` entity type is described with following config:
```js
A.app({
  entities: function(Fields) {
    return {
      Student: {
        ...
      }
    }
  }
});
```
Entity type description has following structure:
```js
{
  referenceName: "...",
  customView: { ... },
  fields: { ... },
  filtering: { ... },
  sorting: [ ... ],
  views: { ... },
  <CRUD_hook_name>: { ... },
  actions: { ... },
  permissions: { ... },
}
```
`referenceName` defines entity field name used to show items in reference fields (`Fields.reference()`, `Fields.fixedReference()`).
`permissions` property defines roles that could access entity type.
In order to define `foo` and `bar` as read roles and `foobar` as write role you could do:
```js
  permissions: {
    read: ['foo', 'bar'],
    write: ['foobar']
  }
```
Other properties of entity are described below.

### CustomView
`customView` is used to specify custom layout of UI. If property is undefined, then default auto-generated layout will be used for entity web view.
Property value refers to template, which needs to be defined in `.jade` file. AllcountJS uses [jade template engine](http://jade-lang.com/) to produce resulting HTML. 

For example, this definition:
```js
customView: "board"
```
requires `board.jade` file with jade template source code inside.

### Sorting

By default all entities sorted by modify date. To override this behavior you could use `sorting` property as follows

```js
A.app({
  entities: {
    Teacher: {
      fields: function (Fields) { return {
        firstName: Fields.text('First name'),
        lastName: Fields.text('Last name')
      }},
      sorting: [['lastName', 1], ['firstName', 1]]
    }
  }
});
```

You could use `1` or `-1` depending on what sorting direction you need: ascending or descending.


### Filtering

Filtering could be used to show only specific data subset for entity or mostly for entity view.
Filtering is defined with `filtering` property of entity view configuration as follows

```js
views: {
  NotCompleteTasks: {
    title: 'Incomplete tasks',
    filtering: 'isComplete = false'
  }
},
```

`filtering` property should contain filtering expression.
It could be a `String` and then it's interpreted as AllcountJS query.
To pass filtering expression object instead of query you could use `Queries` API:

```js
views: {
  NotCompleteTasks: {
    title: 'Incomplete tasks',
    filtering: function (Queries) {
      return Queries.filtering({isComplete: false});
    }
  }
},
```

Pass multiple fields in filtering expression to achieve SQL `and` like effect for your query as follows

```js
views: {
  NotCompleteTasks: {
    title: 'Incomplete tasks',
    filtering: function (Queries) {
      return Queries.filtering({isComplete: false, priority: 2});
    }
  }
},
```

Now supported only simple equality expressions.
Also you could pass object that will mean a MongoDB (read mongoose) query as follows

```js
views: {
  NotCompleteTasks: {
    title: 'Incomplete tasks',
    filtering: { isComplete: false }
  }
},
```

See MongoDB's [Query Documents](http://docs.mongodb.org/manual/tutorial/query-documents/) doc to learn how MongoDB queries should look like.

There's an ability to filter entities depending on current `User`. For example if you have reference field `assignedEmployee` that references `User` entity you could write filtering like

```js
views: {
  AssignedToMe: {
    title: 'Assigned to me',
    filtering: function (Queries, User) {
      return Queries.filtering({assignedEmployee: User.id});
    }
  }
},
```

### CRUD hooks

You could execute your own custom code when create, update or delete is performed for entity.
There are two phases: before and after operation.
There is also save operation that triggers on update and create.
So there are 8 possible CRUD hooks

* `beforeCreate(Entity)`
* `beforeUpdate(NewEntity, OldEntity)`
* `beforeDelete(Entity)`
* `beforeSave(Entity)`
* `afterCreate(Entity)`
* `afterUpdate(NewEntity, OldEntity)`
* `afterDelete(Entity)`
* `afterSave(Entity)`

where `Entity` - entity triggered the operation, `NewEntity` - entity triggered operation after applying update, `OldEntity` - entity triggered operation before applying update.
Each hook should return a promise if there is a need for async operation like DB access.

For example if you want compute some field before saving an entity you should write

```js
A.app({
  ...,
  entities: {
    Teacher: {
      fields: function (Fields) { return {
        firstName: Fields.text('First name'),
        lastName: Fields.text('Last name'),
        fullName: Fields.text('Full name').readOnly()
      }},
      beforeSave: function (Entity) {
        Entity.fullName = Entity.firstName + ' ' + Entity.lastName;
      }
    }
  }
});
```

On other hand if you need do something after creation you could write

```js
A.app({
  ...,
  entities: {
    Teacher: {
      fields: function (Fields) { return {
        firstName: Fields.text('First name'),
        lastName: Fields.text('Last name')
      }},
      afterCreate: function (Entity, Crud) {
        return Crud.crudForEntityType('Class').createEntity({name: Entity.lastName + "'s class"});
      }
    }, ...
  }
});
```

## Fields

To define fields you should use `Fields` API.
`fields` property should be an object.
Property names of that object are field names.
You could define following field types.

### Primitive types

Primitive fields types are:

* `Fields.text(name)`
* `Fields.textarea(name)`
* `Fields.date(name)`
* `Fields.integer(name)`
* `Fields.money(name)`
* `Fields.checkbox(name)`
* `Fields.attachment(name)`
* `Fields.password(name)`
* `Fields.link(name)`
* `Fields.email(name)`

`Fields.text(name)` is used to define text fields.
If you want to define text field `foo` with 'Foo' label you could write:
```js
  fields: function (Fields) {
    return {
      foo: Fields.text('Foo')
    }
  }
```
Note that `fields` property could be the function instead of `entities` property because every property could be a function.

### Relationships

Every entity could be referenced by any another entity using reference fields.
Reference fields are defined using

* `Fields.reference(name, referenceEntityTypeId)` - reference with create ability.
* `Fields.multiReference(name, referenceEntityTypeId)` - many-to-many relation reference with create ability.
* `Fields.fixedReference(name, referenceEntityTypeId)` - fixed combo box.

To define reference field in `Student` labeled 'Tutor' to `Teacher` entity type you could do:
```js
A.app({
  entities: {
    Student: {
      fields: function (Fields) { return {
        tutor: Fields.reference('Tutor', 'Teacher')
      }}
    }
  }
});
```

Defined reference field could also be used to build one-to-many relationship field.
One-to-many relationship field is displayed as a detail grid in a entity form.
It's defined using `Fields.relation(name, relationEntityTypeId, backReferenceField)`.
To define relationship `Tutor`-to-`Student`s relationship in a `Teacher` entity you could do:
```js
A.app({
  entities: {
    Teacher: {
      fields: function (Fields) { return {
        myStudents: Fields.relation('My students', 'Student', 'tutor')
      }}
    }
  }
});
```

### Validation
You could require field values for create and update operations by defining them as `.required()` as follows

```js
  fields: function (Fields) {
    return {
      foo: Fields.text('Foo').required()
    }
  }
```

### Read only fields
You could define read only field by marking it `.readOnly()` as follows

```js
  fields: function (Fields) {
    return {
      foo: Fields.text('Foo').readOnly()
    }
  }
```

### Total rows
`Fields.money` and `Fields.integer` could be summed up using `addToTotalRow()` directive as follows
```js
A.app({
  entities: {
    StudentClassHours: {
      fields: function (Fields) { return {
        student: Fields.reference('Student', 'Student'),
        class: Fields.reference('Class', 'Class'),
        hours: Fields.integer('Hours').addToTotalRow()
      }}
    }
  }
});
```

### Computed fields
Field values could be evaluated automatically by declaring them as computed using `computed()` directive
```js
A.app({
  entities: {
    Student: {
      fields: function (Fields) { return {
        studentHours: Fields.relation("Class hours", "StudentClassHours", "student"),
        totalHours: Fields.integer('Total Hours').computed('sum(studentHours.hours)')
      }}
    }
  }
});
```

Now supported only `sum()` computation function for relationships as described in example above.

### Images

AllcountJS supports [Cloudinary](http://cloudinary.com/) image store by allowing to define cloudinary image field as `Fields.cloudinaryImage(name)`.
In order to use it you should provide your cloudinary credentials as follows:
```js
A.app({
  cloudinaryName: '...',
  cloudinaryApiKey: '...',
  cloudinaryApiSecret: '...',
  ...
});
```

## Actions

AllcountJS allows to define custom actions for entities.
You could define action array as follows

```js
A.app({
  entities: {
    Student: {
      ...,
      actions: [{
        id: 'graduate',
        name: 'Graduate',
        actionTarget: 'single-item',
        perform: function (Crud, Actions) {
          var crud = Crud.actionContextCrud();
          return crud.readEntity(Actions.selectedEntityId()).then(function (entity) {
            entity.isEducationFinished = true;
            return crud.updateEntity(entity);
          }).then(function () {
            return Actions.refreshResult();
          });
        }
      }]
    }
  }
});
```

Each action should have following properties

- `id` will be used to identify your action and should be unique.
- `name` will be showed as button label.
- `actionTarget` could be `'all-items'` or `'single-item'`. This property defines where action will be shown: grid view or form view. If action is shown in form view then `Actions.selectedEntityId()` is defined and equals to selected form entity id.
- `perform()` will be called when user invokes action. It should return promise for action result.

### Action results

Action result is a command returned to the client after action `perform()` is completed.
Standard action results are

- `Actions.refreshResult()` - refresh view.
- `Actions.navigateToEntityTypeResult(entityTypeId)` - navigate to passed `entityTypeId`.

## Entity Views

Entity view is an entity type that uses same physical database collection or table as it's parent.
Entity view concept is derived from SQL Views.
Entity view is the best place to customize presentation of your data for users including filtering, sorting, security, etc.
Entity views could be defined using `views` property of entity type.
All properties allowed for entity types could be used for entity views.
For example if you want to define `StudentsForTutor` view to show only `name` field in the grid view you could do:
```js
A.app({
  entities: {
    Student: {
      fields: function (Fields) { return {
        name: Fields.text('Name'),
        tutor: Fields.fixedReference('Tutor', 'Teacher')
      }},
      views: {
        StudentsForTutor: {
          showInGrid: ['name']
        }
      }
    }
  }
});
```

## Roles and permissions

Application roles are defined using `roles` property.
In order to define `foo` and `bar` roles you could write:
```js
A.app({
  roles: ['foo', 'bar']
})
```

Roles should be referenced in `permissions` property as follows:

```js
A.app({
  ...,
  entities: function(Fields) {
    return {
      Student: {
        permissions: {
          read: null,
          write: ['bar'],
          delete: []
        }
      }
    }
  }
});
```

This permission config tells us that anyone can read, `bar` can write and no one can delete `Student` entities.

There is a hierarchy of permissions: `read` <- `write` <- (`create`, `update`, `delete`).
It means for example when AllcountJS tries to resolve `create` permission it checks for `create` property of `permissions` property.
If it's `undefined` it tries to check `write` and then `read` property.

## Migrations

AllcountJS provides way to perform your data structure version management.
Transitions between version defined as follows

```js
A.app({
  migrations: function (Migrations) { return [
    {
      name: "demo-records-1-student",
      operation: Migrations.insert("Student", [
        {id: "1", firstName: "John", lastName: "Doe", educationStartDate: "2014-09-01"}
      ])
    },
    {
      name: "demo-records-1-teacher",
      operation: Migrations.insert("Teacher", [
        {id: "1", firstName: "George", lastName: "Smith"}
      ])
    },
    {
      name: "demo-records-1-classes",
      operation: Migrations.insert("Class", [
        {id: "1", name: "History class", teacher: {id: "1"}}
      ])
    },
    {
      name: "demo-records-1-classes-students",
      operation: Migrations.insert("ClassToStudent", [
        {student: {id: "1"}, class: {id: "1"}}
      ])
    }
  ]}
});
```

Each transition should have unique `name` and `operation`.
To enable entity referencing in migrations there is a way to define `id`'s: you should declare it as unique integer number.

## Theming

You could configure usage of your own theme by defining

```js
A.app({
    theme: 'foo'
})
```

According to this configuration AllcountJS will search your theme in `public/assets/less/foo-theme.less` file.
In fact your theme file would be concatenated with [Twitter Bootstrap](http://getbootstrap.com) LESS files.
So you could override variables or whatever style you want.
For additional info please read [Customize](http://getbootstrap.com/customize/) section of Twitter Bootstrap docs.

## Public assets

After you create `public` path in your configuration repository contents of this path will be served as static.
So you could put images, scripts and another assets you want to publish for your application.

# Default Entity Types

AllcountJS provides a way to define default entity types.
Default entity type would be available to your application even in case you don't define it in your configuration.
On other hand if you define entity type with same name as default entity type has your entity type would inherit all properties from default one as in case of views.
Now there is only one default entity type: `User`.

## User

`User` is a default entity type used to authenticate and authorize users of AllcountJS application.
It has some predefined fields: `username`, `passwordHash` and fields for setting roles:

* `username` - user's name used to authenticate users,
* `passwordHash` - SHA1 HMAC password hash salted with entity `id`,
* `role_<roleName>` - checkbox fields for setting user roles in array `roles` MongoDB field.

You could implement user profiles by creating views for `User` entity type.
For example one could write
```
A.app({
  ...,
  entities: function(Fields) {
    return {
      User: {
        views: {
          Profile: {
            customView: 'profile',
            title: "Profiles",
            fields: {
              username: Fields.text("User name").readOnly(),
              firstName: Fields.text("First name").required(),
              lastName: Fields.text("Last name").required(),
              birthDate: Fields.date("Birth date").required(),
              phone: Fields.text("Phone").required()
            },
            filtering: function (User) {
              return {_id: User.id};
            },
            permissions: {
              read: null,
              write: null
            }
          }
        }
      }
    }
  }
});
```

This configuration defines `Profile` entity type that could be edited only by current user.
You could note that `username` field is reused from `User` and other fields are added.
There is no constraints on field types and count for `User` entity type until your field names don't clash with default field names.

## Extending Default Entity Types

You could use `$parentProperty` dependency to get value of property from previous entity type definition. It could be very handful if you want add some fields to already defined entity type somewhere. For example to add `customer` field to `User` you could write:

```js
A.app({
  ...,
  entities: function(Fields) {
    return {
      User: {
        fields: function ($parentProperty) {
          $parentProperty.customer = Fields.reference(…);
          return $parentProperty;
        }
      }
    }
  }
});

```

# APIs

There are numerous APIs could be required in various config property definitions.
To learn how APIs could be required please see [App Config Structure](#app-config-structure).
Some of APIs are context depended.
For example `User` API - current user instance is available for `filtering` and action's `perform` properties and not available for properties such as `entities` or `fields`.

## Crud

Methods

* `actionContextCrud()` - returns crud instance for entity type where performed action is declared. For example if performed action is defined for `Foo` entity type then crud instance for `Foo` is returned.
* `crudForEntityType(entityTypeId)` - returns crud instance for passed `entityTypeId`

Crud instance has following methods

* `find(query)` - get all entities for passed `query` and return it as array. Pass `query` object in `{query: mongoDbQueryDoc}` format to use MongoDB queries.
* `createEntity(entity)` - create entity for passed `entity` object and return it's `id`. Entity identifier is stored in `id` field.
* `readEntity(entityId)` - read and return entity by specified entity identifier `entityId`.
* `updateEntity(entity)` - update entity with passed `entity` object and return updated instance. `id` property for `entity` is required. It's not required to pass all object properties - not passed properties aren't updated. To delete `foo` property pass `null` value: `crud.updateEntity({id: entityId, foo: null})`.
* `deleteEntity(entityId)` - delete entity by specified entity identifier `entityId`. Returns nothing.

All of the methods return promises.
So for example to get all entities of `Foo` objects one should write

```js
function (Crud) {
  return Crud.crudForEntityType('Foo').find(query: {}).then(function (fooEntities) {
    // do something with fooEntities
  })
}
```

To learn more about promises please read [kriskowal's Q docs](http://documentup.com/kriskowal/q/).

## Google Export

There's a way for templated export of your Entity's data to Google docs or Google spreadsheets. There are two methods in `Actions` API for that:

* `exportToGoogleDoc(googleWebAppUrl, fileName, dataSource, templateId, folderId)` - call Google script web app at `googleWebAppUrl` and pass `dataSource` - could be array or object, `templateId` - Google file id for template document, `folderId` - Google folder id where to save exported file. This action returns url to newly created Google document.
* `openGoogleDocument(exportActionResult)` - This method return `ActionResult` that opens Google document by passed url in `exportActionResult`.

In order to configure Google script web app for Google SpreadSheet you need:

1. Create Google spreadsheet template file. Example: [https://docs.google.com/spreadsheets/d/1DgqLCTPZpEwAaEiyKsL9rwBBUA7XWm0LMkpdcgpGgjY/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1DgqLCTPZpEwAaEiyKsL9rwBBUA7XWm0LMkpdcgpGgjY/edit?usp=sharing).
2. Enter to Script Editor (Tools -> Script Editor)
3. Insert this Gist contents as script: [https://gist.github.com/paveltiunov/03d99ac422a54b0b58ee](https://gist.github.com/paveltiunov/03d99ac422a54b0b58ee)
4. Insert [underscore.js](http://underscorejs.org/underscore.js) as a script.
5. Publish your web app visible for anyone.
6. Use published web app url in your action call.
