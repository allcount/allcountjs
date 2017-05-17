'use strict'

var stream = require('stream')
var Promise = require('promise')

if (!stream.Transform) {
  module.exports = requires10
  requires10.Readable = requires10
  requires10.Writable = requires10
  requires10.Duplex = requires10
  requires10.Transform = requires10
  requires10.PassThrough = requires10

  requires10.FlatMap = requires10
  requires10.Map = requires10
  requires10.Filter = requires10

  requires10.BufferTransform = requires10
} else {
  module.exports = barrage
  barrage.Readable = load('Readable')
  barrage.Writable = load('Writable')
  barrage.Duplex = load('Duplex')
  barrage.Transform = load('Transform')
  barrage.PassThrough = load('PassThrough')

  barrage.FlatMap = FlatMap
  barrage.Map = Map
  barrage.Filter = Filter

  barrage.BufferTransform = BufferTransform
}


function barrage(s) {
  s.syphon = syphon
  s.wait = wait
  s.buffer = buffer

  s.flatMap = flatMap
  s.map = map
  s.filter = filter

  s.bufferTransform = bufferTransform
  return s
}

/* Helpers */

function requires10() {
  throw new Error('barrage requires that you are using at least node.js v0.10.x')
}

function load(clsName) {
  var cls = stream[clsName]
  function Barrage() {
    if (!(this instanceof Barrage)) {
      throw new Error('Missing "new" on stream constructor');
    }
    return cls.apply(this, arguments)
  }
  Barrage.prototype = Object.create(cls.prototype)
  barrage(Barrage.prototype)
  return Barrage
}

var forof = null
try {
  forof = Function('collection, fn', 'for (var x of collection) fn(x)')
} catch (ex) {
  forof = function (collection, fn) {
    for (var i = 0; i < collection.length; i++) {
      fn(collection[i])
    }
  }
}

function promiseify(fn) {
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      var res = fn.apply(self, args)
      if (res !== undefined) {
        resolve(res)
      }
    })
  }
}

/* Extensions */

function syphon(stream, options) {
  this.on('error', stream.emit.bind(stream, 'error'))
  return this.pipe(stream, options)
}

function wait(callback) {
  var self = this
  var p = new Promise(function (resolve, reject) {
    self.on('error', reject)
    self.on('finish', resolve)
    self.on('end', resolve)
    self.on('close', resolve)
    if (typeof self.resume === 'function') self.resume()
  })
  return p.nodeify(callback)
}

function buffer(encoding, callback) {
  if (typeof encoding === 'function') callback = encoding, encoding = undefined

  var self = this
  var p = new Promise(function (resolve, reject) {
    var dest = new stream.Writable({decodeStrings: !!encoding, objectMode: !encoding})
    var erred = false
    var body = []
    dest._write = function (chunk, encoding, callback) {
      if (!erred) {
        body.push(chunk)
      }
      callback()
    }
    dest.on('error', function (err) {
      reject(err)
      erred = true
    })
    dest.on('finish', function () {
      if (erred) return
      if (encoding === 'buffer') resolve(Buffer.concat(body))
      else if (encoding) resolve(Buffer.concat(body).toString(encoding))
      else resolve(body)
    })
    self.syphon(dest)
  })
  return p.nodeify(callback)
}

function flatMap(transform, options) {
  return this.syphon(new FlatMap(transform, options))
}
function map(transform, options) {
  return this.syphon(new Map(transform, options))
}
function filter(transform, options) {
  return this.syphon(new Filter(transform, options))
}
function bufferTransform(transform, encoding) {
  return this.syphon(new BufferTransform(transform, encoding))
}

/* Custom Streams */
function FlatMap(transform, options) {
  options = options || {}
  if (options.objectMode !== false) options.objectMode = true
  barrage.Transform.call(this, options)

  this._flatMap = promiseify(transform)
  this._flatMapParallel = options.parallel || 1

  this._flatMapQueue = Promise.resolve(null)
  this._flatMapQueueLength = 0
  this._flatMapCallbacks = []

  this._transform = _transform
  this._flush = _flush
}
FlatMap.prototype = Object.create(barrage.Transform.prototype)
FlatMap.prototype.constructor = FlatMap
FlatMap._transform = _transform
function _transform(chunk, encoding, callback) {
  var self = this
  self._flatMapQueueLength++
  var result = self._flatMap(chunk)
  self._flatMapQueue = self._flatMapQueue
    .then(function () {
      return result
    })
    .then(function (result) {
      if (typeof result.pipe === 'function') {
        return barrage(result).on('data', self.push.bind(self)).wait();
      }
      return forof(result, self.push.bind(self))
    }, function (err) {
      self.emit('error', err)
    })
    .then(function () {
      self._flatMapQueueLength--
      if (self._flatMapCallbacks.length) self._flatMapCallbacks.shift()()
    })
  self._flatMapQueue.done()

  if (self._flatMapQueueLength < self._flatMapParallel) {
    callback()
  } else {
    self._flatMapCallbacks.push(callback)
  }
}
function _flush(callback) {
  this._flatMapQueue.nodeify(callback)
}

function Map(transform, options) {
  transform = promiseify(transform)
  function wrap(val) {
    return [val]
  }
  FlatMap.call(this, function (chunk) {
    return transform(chunk).then(wrap)
  }, options)
}
Map.prototype = Object.create(FlatMap.prototype)
Map.prototype.constructor = Map

function Filter(transform, options) {
  transform = promiseify(transform)
  FlatMap.call(this, function (chunk) {
    return transform(chunk).then(function (include) {
      if (include) return [chunk]
      else return []
    })
  }, options)
}
Filter.prototype = Object.create(FlatMap.prototype)
Filter.prototype.constructor = Filter

function BufferTransform(transform, encoding) {
  barrage.Transform.call(this, {decodeStrings: !!encoding, objectMode: !encoding})

  transform = promiseify(transform)
  var body = []

  this._transform = function (chunk, encoding, callback) {
    body.push(chunk)
    callback()
  }
  this._flush = function (callback) {
    var result
    if (encoding === 'buffer') result = Buffer.concat(body)
    else if (encoding) result = Buffer.concat(body).toString(encoding)
    else result = body
    var self = this
    transform(result)
      .then(function (result) {
        self.push(result)
      }, function (err) {
        self.emit('error', err)
      })
      .done(function () {
        callback()
      })
  }
}
BufferTransform.prototype = Object.create(barrage.Transform.prototype)
BufferTransform.prototype.constructor = BufferTransform
