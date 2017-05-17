#mongoose-long
===============

Provides Number Long support for [Mongoose](http://mongoosejs.com).

[![Build Status](https://secure.travis-ci.org/aheckmann/mongoose-long.png)](http://travis-ci.org/aheckmann/mongoose-long)

Example:

```js
var mongoose = require('mongoose')
require('mongoose-long')(mongoose);

var SchemaTypes = mongoose.Schema.Types;
var partSchema = new Schema({ long: SchemaTypes.Long });

var Part = db.model('Part', partSchema);
var part = new Part({ long: "9223372036854775806" });

var Long = mongoose.Types.Long;
part.long = part.long.divide(Long.fromString("2"));
part.save()
```

### install

```
npm install mongoose-long
```

See [node-mongodb-native](http://mongodb.github.com/node-mongodb-native/api-bson-generated/long.html) docs on all the `Long` methods available.

[LICENSE](https://github.com/aheckmann/mongoose-long/blob/master/LICENSE)
