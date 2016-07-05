z-schema-errors
========
A module to normalize error messages from [Z-Schema](https://github.com/zaggino/z-schema) error reports.

Installing
------------
```Shell
npm install z-schema-errors
```

Introduction
----------
This module aims to standarize how messages are created for reports. It:
* Automatically transforms nested properties and array elements in `path` into a friendly notation that can be understood by programmers. For example `path: '#/items/[0]'` becomes `items[0]`.
* Extracts the first nested array in `params`.
* Allows users to customize message format on an error code basis, specifying where to place different properties using macros. Supported macros are: `{message}`, `{path}`, `{description}`, `{params}`.
* Allows users to provide a `contextMessage` to be included in all errors through the `{contextMessage}` macro.
* Allows user to specify how the values for `{message}`, `{path}`, `{description}`, `{params}` are generated.

> To check the defaults take a look at the [source code](https://github.com/dschenkelman/z-schema-errors/blob/master/lib/index.js#L8-L30).

Basic usage
-----------
Use this if you want to get quickly started:
```javascript
var ZSchema = require('z-schema');
var ZSchemaErrors = require('z-schema-errors');

var validator = new ZSchema();
var reporter = ZSchemaErrors.init();

var isValid = validator.validate(json, schema);

if (!isValid){
    console.log(validator.lastReport);
    // {
    //    errors:
    //    [
    //          {
    //              code: 'ENUM_MISMATCH',
    //              params: [ 'invalid_value' ],
    //              description: 'The elements'
    //              path: '#/elements',
    //          }
    //     ]
    // };

    var errorMessage = reporter.extractMessage(validator.lastReport);

    console.log(errorMessage);
    // prints "An error occurred 'Invalid property \"invalid_value\"' on property elements (The elements)."
}
```

Customizing the format of messages
-----------------
If you want more control over how the message is created:
```javascript
var ZSchema = require('z-schema');
var ZSchemaErrors = require('z-schema-errors');

var validator = new ZSchema();
var reporter = ZSchemaErrors.init({
    formats: {
        'INVALID_TYPE': '{path} has an invalid type. Error: {message}'
    }
});

var isValid = validator.validate(json, schema);

if (!isValid){
    console.log(validator.lastReport);
    // {
    //    errors:
    //    [
    //          {
    //              code: 'INVALID_TYPE',
    //              path: '#/items/[0]',
    //              description: 'The item',
    //              message: 'Expected type number but found type string'
    //          }
    //     ]
    // };
    var errorMessage = reporter.extractMessage(validator.lastReport);

    console.log(errorMessage);
    // prints "items[0] has an invalid type. Error: Expected type number but found type string"
}
```

Customizing macro values
-----------------
If you want more control over how each macro value is determined:
```javascript
var ZSchema = require('z-schema');
var ZSchemaErrors = require('z-schema-errors');

var validator = new ZSchema();
var reporter = ZSchemaErrors.init({
    extractors: {
        description: function(d){ return 'Description: ' + d; }
    }
});

var isValid = validator.validate(json, schema);

if (!isValid){
    console.log(validator.lastReport);
    // {
    //    errors:
    //    [
    //          {
    //              code: 'INVALID_TYPE',
    //              path: '#/items/[0]',
    //              description: 'The item',
    //              message: 'Expected type number but found type string'
    //          }
    //     ]
    // };
    var errorMessage = reporter.extractMessage(validator.lastReport);

    console.log(errorMessage);
    // prints "An error occurred 'Expected type number but found type string' on property items[0] Description: The item."
}
```

Customizing the context message
-------------------
If you want to change the context message:
```javascript
var ZSchema = require('z-schema');
var ZSchemaErrors = require('z-schema-errors');

var validator = new ZSchema();
var reporter = ZSchemaErrors.init({
    contextMessage: 'Error!!!'
});

...

var isValid = validator.validate(json, schema);

if (!isValid){
    console.log(validator.lastReport);
    // {
    //    errors:
    //    [
    //          {
    //              code: 'INVALID_TYPE',
    //              path: '#/items/[0]',
    //              description: 'The item',
    //              message: 'Expected type number but found type string'
    //          }
    //     ]
    // };
    var errorMessage = reporter.extractMessage(validator.lastReport);

    console.log(errorMessage);
    // prints ""Error!!! 'Expected type number but found type string' on property items[0] (The item)."
}
```

Contributing
---------
Pull requests and issues are more than welcome. When submitting a PR make sure to run the tests:
``` Shell
npm test
```