'use strict'

var assert = require('assert')
var s = require('stream')
var Promise = require('promise')
var b = require('../')

describe('barrage(stream) mixin', function () {
  it('returns `stream` with a mixin', function () {
    var r = new s.Readable()
    var w = new s.Writable()
    var t = new s.Transform()
    assert(b(r) === r)
    assert(b(w) === w)
    assert(b(t) === t)
  })
})

function streamType(name, type) {
  describe('barrage.' + name, function () {
    var i = new b[name]()
    it('is an instance of stream.' + name, function () {
      assert(i instanceof s[name])
    })
    it('is not the same as stream.' + name, function () {
      assert(b[name] != s[name])
    })
    it('is a ' + type + ' barrage', function () {
      if (type === 'readable' || type === 'writable') {
        assert(typeof i.syphon === 'function')
        assert(typeof i.buffer === 'function')
        assert(typeof i.wait === 'function')
      } else {
        throw new Error('unrecognized type')
      }
    })
  })
}
streamType('Readable', 'readable')
streamType('Writable', 'writable')
streamType('Duplex', 'readable')
streamType('Transform', 'readable')
streamType('PassThrough', 'readable')

describe('barrage extensions', function () {
  describe('BarrageStream#syphon', function () {
    it('pipes data', function (done) {
      var source = new b.Readable()
      source._read = function () {
        this.push('foo')
        this.push('bar')
        this.push(null)
      }
      var dest = new b.PassThrough()
      source.syphon(dest)
      var data = []
      dest
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.equal('foobar', data.join(''))
          done()
        })
    })
    it('pipes errors', function (done) {
      var singleton = {}
      var source = new b.Readable()
      source._read = function () {
      }
      var dest = new b.PassThrough()
      source.syphon(dest)
      dest.on('error', function(err) {
        assert.equal(singleton, err)
        done()
      })
      source.emit('error', singleton)
    })
  })
  describe('BarrageStream#wait', function () {
    it('waits for `finish` or `end` events and catches `error` events', function (done) {
      var source = new b.Readable()
      source._read = function () {
        this.push('foo')
        this.push('bar')
        this.push(null)
      }
      source.wait(function (err, data) {
        if (err) return done(err)
        assert.equal(undefined, data)
        var sourceB = new b.Readable()
        sourceB._read = function () {
        }
        var singleton = {}
        sourceB.wait(function (err) {
          assert.equal(singleton, err)
          done()
        })
        sourceB.emit('error', singleton)
      })
    })
  })
  describe('BarrageStream#buffer', function () {
    it('buffers the content of a Readable stream and catches `error` events', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push('foo')
        this.push('bar')
        this.push(null)
      }
      source.buffer(function (err, data) {
        if (err) return done(err)
        assert.deepEqual(['foo', 'bar'], data)
        var sourceB = new b.Readable({objectMode: false})
        sourceB._read = function () {
          this.push('foo')
          this.push('bar')
          this.push(null)
        }
        sourceB.buffer('buffer', function (err, data) {
          if (err) return done(err)
          assert(Buffer.isBuffer(data))
          assert.equal('foobar', data.toString())

          var sourceC = new b.Readable({objectMode: false})
          sourceC._read = function () {
            this.push('foo')
            this.push('bar')
            this.push(null)
          }
          sourceC.buffer('utf8', function (err, data) {
            if (err) return done(err)
            assert(typeof data === 'string')
            assert.equal('foobar', data)

            var sourceD = new b.Readable()
            sourceD._read = function () {
            }
            var singleton = {}
            sourceD.buffer(function (err) {
              assert.equal(singleton, err)
              done()
            })
            sourceD.emit('error', singleton)
          })
        })
      })
    })
  })
  describe('BarrageStream#map', function () {
    it('maps each element onto a new element', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      source.map(function (x) { return x * x })
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [1, 4, 9])
          done()
        })
    })
    it('can be used asynchronously', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      source.map(function (x, callback) { setImmediate(function () { callback(null, x * x) }) })
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [1, 4, 9])
          done()
        })
    })
    it('can be used with a promise', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      source.map(function (x) { return Promise.resolve(x * x) })
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [1, 4, 9])
          done()
        })
    })
    it('can be used in parallel', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      var running = 0
      source.map(function (x, callback) {
        running++
        if (x === 1) {
          setTimeout(function () {
            running--
            callback(null, x * x)
          }, 100)
        }
        if (x === 2) {
          assert(running === 2)
          setTimeout(function () {
            running--
            callback(null, x * x)
          }, 50)
        }
        if (x === 3) {
          assert(running <= 2)
          setTimeout(function () {
            running--
            callback(null, x * x)
          }, 0)
        }
      }, {parallel: 2})
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [1, 4, 9])
          done()
        })
    })
  })
  describe('BarrageStream#filter', function () {
    it('filters each element', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      source.filter(function (x) { return x > 1 })
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [2, 3])
          done()
        })
    })
    it('can be used asynchronously', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      source.filter(function (x, callback) { setImmediate(function () { callback(null, x > 1) }) })
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [2, 3])
          done()
        })
    })
    it('can be used with a promise', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      source.filter(function (x) { return Promise.resolve(x > 1) })
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [2, 3])
          done()
        })
    })
    it('can be used in parallel', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      var running = 0
      source.filter(function (x, callback) {
        running++
        if (x === 1) {
          setTimeout(function () {
            running--
            callback(null, false)
          }, 100)
        }
        if (x === 2) {
          assert(running === 2)
          setTimeout(function () {
            running--
            callback(null, true)
          }, 50)
        }
        if (x === 3) {
          assert(running <= 2)
          setTimeout(function () {
            running--
            callback(null, true)
          }, 0)
        }
      }, {parallel: 2})
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [2, 3])
          done()
        })
    })
  })
  describe('BarrageStream#bufferTransform', function () {
    it('transforms as a buffer', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      source.bufferTransform(function (x) { return x.reverse() })
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [[3, 2, 1]])
          done()
        })
    })
    it('supports an encoding option', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push('h')
        this.push('e')
        this.push('l')
        this.push('l')
        this.push('o')
        this.push(null)
      }
      var data = []
      source.bufferTransform(function (x) { return x + ' world' }, 'utf8')
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk.toString('utf8'))
        })
        .on('end', function () {
          assert.deepEqual(data, ['hello world'])
          done()
        })
    })
  })
  describe('BarrageStream#flatMap(val->stream)', function () {
    it('transforms as a stream', function (done) {
      var source = new b.Readable({objectMode: true})
      source._read = function () {
        this.push(1)
        this.push(2)
        this.push(3)
        this.push(null)
      }
      var data = []
      source.flatMap(function (x) {
          var source = new b.Readable({objectMode: true})
          source._read = function () {
            this.push(x * 1)
            this.push(x * 2)
            this.push(null)
          }
          return source
        })
        .on('error', done)
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          assert.deepEqual(data, [1, 2, 2, 4, 3, 6])
          done()
        })
    })
  })
})
