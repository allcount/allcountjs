
Description
===========

Connect middleware for [busboy](https://github.com/mscdex/busboy).


Requirements
============

* [node.js](http://nodejs.org/) -- v0.8.0 or newer


Install
============

    npm install connect-busboy


Example
=======

```javascript
var busboy = require('connect-busboy');

// default options, no immediate parsing
app.use(busboy());
// ...
app.use(function(req, res) {
  req.pipe(req.busboy);
  req.busboy.on('file', function(fieldname, file, filename) {
    // ...
  });
  // etc ...
});

// default options, immediately start reading from the request stream and
// parsing
app.use(busboy({ immediate: true }));
// ...
app.use(function(req, res) {
  req.busboy.on('file', function(fieldname, file, filename) {
    // ...
  });
  // etc ...
});

// any valid Busboy options can be passed in also
app.use(busboy({
  highWaterMark: 2 * 1024 * 1024,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
}));

```
