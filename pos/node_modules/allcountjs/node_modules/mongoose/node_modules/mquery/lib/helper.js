
var debug = require('debug')('yield:inputhelper');
var isObject = require('is-object');
var hasOwn = require('has-own');
var ObjectId = require('mongodb').ObjectID;

exports.cast = function cast(arg) {
  debug('cast %s', arg);

  if (!arg) return {};

  // find(id)
  if (isHexString(arg)) {
    return { _id: new ObjectId(arg) };
  }

  if (!isObject(arg))
    throw new TypeError('invalid selector');

  // find({ _id: '54049bff83359f9872f94c19' })
  if (arg._id && isHexString(arg._id)) {
    arg._id = new ObjectId(arg._id);
  }

  return arg;
}

function isHexString(arg) {
  return 24 == arg.length && 'string' == typeof arg;
}
