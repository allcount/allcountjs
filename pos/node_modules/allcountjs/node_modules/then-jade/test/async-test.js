'use strict';

var Promise = require('promise');
var ty = require('then-yield');

global.async = function (name, fn) {
  return it(name, function (done) {
    ty.spawn(fn, Promise.cast).nodeify(done);
  })
};