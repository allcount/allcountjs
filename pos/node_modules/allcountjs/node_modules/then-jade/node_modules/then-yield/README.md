# then-yield

Promise based generators with no dependency on a specific promise library.

To create a version specific to your library, just use:

```javascript
var ty = require('then-yield').using(Promise.cast);
```

The goal is to be performant and to ensure that it is as versatile as possible while maintaining a simple interface.  You can use `yield` to wait for a `Promise`, an `Array.<Promise>`.  It also allows you to `yield` a `Generator` (the result of calling a `GeneratorFunction`) but it is preferable to wrap each generator function in `async` or use `yield*`.

[![Build Status](https://travis-ci.org/then/yield.png?branch=master)](https://travis-ci.org/then/yield)
[![Dependency Status](https://gemnasium.com/then/yield.png)](https://gemnasium.com/then/yield)
[![NPM version](https://badge.fury.io/js/then-yield.png)](http://badge.fury.io/js/then-yield)

## Installation

    npm install then-yield

## Usage

### spawn(fn, unwrap)

Immediately evaluate an asynchronous generator function.

```js
var result = ty.spawn(function* () {
  var src = yield readFilePromise('foo.json', 'utf8');
  return JSON.parse(src);
});
```

You may optionally cast the result to a promise.

```js
var result = ty.spawn(function* () {
  var src = yield readFilePromise('foo.json', 'utf8');
  return JSON.parse(src);
}, Promise.cast);
```

This also handles any mis-behaving promises/thenables by calling `Promise.cast`.

Finally, you can insert a delay for each yield:

```js
var result = ty.spawn(function* () {
  var src = yield readFilePromise('foo.json', 'utf8');
  return JSON.parse(src);
}, Promise.cast, function (value) {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), 100);
  });
});
```

### async(fn, unwrap)

Bind an asynchronous generator function to be used later.

```js
var readJSON = ty.async(function* (filename) {
  var src = yield readFilePromise(filename, 'utf8');
  return JSON.parse(src);
});
```

You may optionally cast the result to a promise.

```js
var readJSON = ty.async(function* (filename) {
  var src = yield readFilePromise(filename, 'utf8');
  return JSON.parse(src);
}, Promise.cast);
```

This also handles any mis-behaving promises/thenables by calling `Promise.cast`.

Finally, you can insert a delay for each yield:

```js
var readJSON = ty.async(function* (filename) {
  var src = yield readFilePromise(filename, 'utf8');
  return JSON.parse(src);
}, Promise.cast, function (value) {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), 100);
  });
});
```

### using(castPromise[, unwrapStep])

By default, generators return values, rather than promises, if they never yield a promise.  They also just return a promise of the type of the first promise to be yielded.  This randomness is not always what you want, so we provide the `using` method that allows you to override this behavior:

```js
var ty = require('ty').using(Promise.cast);
```

By default, this is only applied to the final result, and any intermediate promises.  This helps improve performance, but might not always be desirable.  The second argument allows you to unwrap any value.  This could be used to insert delays, or perhaps to support deep-resolution of objects:

```js
var readFiles = ty.using(Promise.cast, unwrap).async(function* () {
  let {left, right} = yield {left: read('left'), right: read('right')};
  return left + right;
});

function unwrap(obj) {
  if (Array.isArray(obj)) return Promise.all(obj);
  if (obj && typeof obj === 'object') {
    var keys = Object.keys(obj);
    var values = Promise.all(keys.map(function (key) { return unwrap(obj[key]); }));
    return values.then(function (values) {
      for (var i = 0; i < values.length; i++) {
        obj[keys[i]] = values[i];
      }
      return obj;
    });
  }
  return obj;
}
```

## License

  MIT