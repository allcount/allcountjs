// Generic Pool Redux
//
// Fork of https://github.com/coopernurse/node-pool
// with prototypes, api changes, and support for the client.
// License: MIT
// ------------------------------------------------
(function(define) {

"use strict";

define(function(require, exports, module) {

  // Initialize arrays to hold queue elements.
  var PriorityQueue = function(size) {
    this.slots = [];
    this.queueSize = Math.max(+size | 0, 1);
    for (var i = 0; i < this.queueSize; i += 1) {
      this.slots.push([]);
    }
  };

  PriorityQueue.prototype = {

    total: null,

    // Calculates the size of the queue, and sets
    // the value to total.
    size: function() {
      if (this.total === null) {
        this.total = 0;
        for (var i = 0; i < this.queueSize; i += 1) {
          this.total += this.slots[i].length;
        }
      }
      return this.total;
    },

    // Clears the cache for total and adds an
    // object to the queue, based on an optional priority.
    enqueue: function(obj, priority) {
      priority = priority && +priority | 0 || 0;
      this.total = null;
      if (priority) {
        var priorityOrig = priority;
        if (priority < 0 || priority >= this.queueSize) {
          priority = (this.size - 1);
        }
      }
      this.slots[priority].push(obj);
    },

    // Clears the cache for total and removes an object
    // from the queue.
    dequeue: function() {
      var obj = null, i, sl = this.slots.length;
      this.total = null;
      for (i = 0; i < sl; i += 1) {
        if (this.slots[i].length) {
          obj = this.slots[i].shift();
          break;
        }
      }
      return obj;
    }

  };

  // Constructor for a new pool.
  var Pool = function(options) {
    if (!(this instanceof Pool)) return new Pool(options);
    this.idleTimeoutMillis = options.idleTimeoutMillis  || 30000;
    this.reapInterval      = options.reapIntervalMillis || 1000;
    this.destroyHandler    = options.destroy || function() {};
    this.refreshIdle       = ('refreshIdle' in options) ? options.refreshIdle : true;
    this.availableObjects  = [];
    this.waitingClients    = new PriorityQueue(options.priorityRange || 1);
    this.create            = options.create || (function() {
      throw new Error('A create method must be defined for the connection pool.');
    })();

    // If a validate method is provided, use that instead of the default.
    if (options.validate) this.validate = options.validate;

    // Set the max & min's on the options.
    var max = parseInt(options.max, 10);
    var min = parseInt(options.min, 10);
    this.max = Math.max(isNaN(max) ? 1 : max, 1);
    this.min = Math.min(isNaN(min) ? 0 : min, this.max - 1);

    // Ensure the minimum is created.
    this.ensureMinimum();
  };

  Pool.prototype = {

    count: 0,

    draining: false,

    removeIdleTimer: null,

    removeIdleScheduled: false,

    // Default validate.
    validate: function() {
      return true;
    },

    // Request a new client. The callback will be called,
    // when a new client will be availabe, passing the client to it.
    // Optionally, yoy may specify a priority of the caller if there are no
    // available resources.  Lower numbers mean higher priority.
    acquire: function(callback, priority) {
      if (this.draining) return callback(new Error("Pool is draining and cannot accept work"));
      this.waitingClients.enqueue(callback, priority);
      this.dispense();
      return (this.count < this.max);
    },

    // Return the client to the pool, in case it is no longer required.
    release: function(obj, callback) {
      // Check to see if this object has already been released (i.e., is back in the pool of availableObjects)
      if (this.availableObjects.some(function(objWithTimeout) {
        return (objWithTimeout.obj === obj);
      })) {
        if (callback) callback(new Error('Release called multiple times on the same object'));
        return;
      }
      var objWithTimeout = {
        obj: obj,
        timeout: (new Date().getTime() + this.idleTimeoutMillis)
      };
      this.availableObjects.push(objWithTimeout);
      this.dispense();
      this.scheduleRemoveIdle();
      if (callback) callback(null);
    },

    // Try to get a new client to work, and clean up pool unused (idle) items.
    //
    // - If there are available clients waiting, shift the first one out (LIFO),
    //   and call its callback.
    // - If there are no waiting clients, try to create one if it won't exceed
    //   the maximum number of clients.
    // - If creating a new client would exceed the maximum, add the client to
    //   the wait list.
    dispense: function() {
      var obj = null,
        objWithTimeout = null,
        err = null,
        clientCb = null,
        waitingCount = this.waitingClients.size();

      if (waitingCount > 0) {
        while (this.availableObjects.length > 0) {
          objWithTimeout = this.availableObjects[0];
          if (!this.validate(objWithTimeout.obj)) {
            this.destroy(objWithTimeout.obj);
            continue;
          }
          this.availableObjects.shift();
          clientCb = this.waitingClients.dequeue();
          return clientCb(err, objWithTimeout.obj);
        }
        if (this.count < this.max) {
          this.createResource();
        }
      }
    },

    // Disallow any new requests and let the request backlog dissapate,
    // Setting the `draining` flag so as to let any additional work on the queue
    // dissapate.
    drain: function(callback) {
      this.draining = true;
      var pool = this;
      var checking = function() {
        if (pool.waitingClients.size() > 0 || pool.availableObjects.length != pool.count) {
          setTimeout(checking, 100);
        } else {
          if (callback) callback();
        }
      };
      checking();
    },

    // Forcibly destroys all clients regardless of timeout. Intended to be
    // invoked as part of a drain. Does not prevent the creation of new
    // clients as a result of subsequent calls to acquire.
    //
    // Note that if this.min > 0, the pool will destroy all idle resources
    // in the pool, but replace them with newly created resources up to the
    // specified this.min value.  If this is not desired, set this.min
    // to zero before calling destroyAllNow()
    destroyAllNow: function(callback) {
      var willDie = this.availableObjects;
      this.availableObjects = [];
      var obj = willDie.shift();
      while (obj !== null && obj !== undefined) {
        this.destroy(obj.obj);
        obj = willDie.shift();
      }
      this.removeIdleScheduled = false;
      clearTimeout(this.removeIdleTimer);
      if (callback) callback();
    },

    // Decorates a function to use a acquired client from the object pool when called.
    pooled: function(decorated, priority) {
      var pool = this;
      return function() {
        var callerArgs = arguments;
        var callerCallback = callerArgs[callerArgs.length - 1];
        var callerHasCallback = typeof callerCallback === 'function';
        pool.acquire(function(err, client) {
          if (err) {
            if (callerHasCallback) callerCallback(err, null);
            return;
          }
          var args = [client].concat(slice.call(callerArgs, 0, callerHasCallback ? -1 : undefined));
          args.push(function() {
            pool.release.call(pool, client);
            if (callerHasCallback) callerCallback.apply(null, arguments);
          });
          decorated.apply(null, args);
        }, priority);
      };
    },

    // Request the client to be destroyed. The factory's destroy handler
    // will also be called. This should be called within an acquire()
    // block as an alternative to release().
    destroy: function(obj) {
      this.count -= 1;
      this.availableObjects = this.availableObjects.filter(function(objWithTimeout) {
        return (objWithTimeout.obj !== obj);
      });
      this.destroyHandler(obj);
      this.ensureMinimum();
    },

    // Checks and removes the available (idle) clients that have timed out.
    removeIdle: function() {
      var toRemove = [],
        now = new Date().getTime(),
        i, availableLength, tr, timeout;

      this.removeIdleScheduled = false;

      // Go through the available (idle) items,
      // check if they have timed out
      for (i = 0, availableLength = this.availableObjects.length; i < availableLength && (this.refreshIdle || (this.count - this.min > toRemove.length)); i += 1) {
        timeout = this.availableObjects[i].timeout;
        if (now >= timeout) {
          // Client timed out, so destroy it.
          toRemove.push(this.availableObjects[i].obj);
        }
      }

      for (i = 0, tr = toRemove.length; i < tr; i += 1) {
        this.destroy(toRemove[i]);
      }

      // Replace the available items with the ones to keep.
      availableLength = this.availableObjects.length;

      if (availableLength > 0) {
        this.scheduleRemoveIdle();
      }
    },

    // Schedule removal of idle items in the pool.
    // More schedules cannot run concurrently.
    scheduleRemoveIdle: function() {
      if (!this.removeIdleScheduled) {
        this.removeIdleScheduled = true;
        var pool = this;
        this.removeIdleTimer = setTimeout(function() {
          pool.removeIdle.call(pool);
        }, this.reapInterval);
      }
    },

    // Creates a new resource, adding an object to the pool
    createResource: function() {
      var pool = this;
      this.count += 1;
      this.create(function(err, obj) {
        var clientCb = pool.waitingClients.dequeue();
        if (err) {
          pool.count -= 1;
          if (clientCb) clientCb(err, null);
          setTimeout(function() {
            pool.dispense.call(pool);
          }, 0);
        } else {
          if (clientCb) return clientCb(null, obj);
          pool.release(obj);
        }
      });
    },

    // If the client isn't in the process of draining, this ensures
    // that the minimum number of resources are always around.
    ensureMinimum: function() {
      var i, diff;
      if (!this.draining && (this.count < this.min)) {
        diff = this.min - this.count;
        for (i = 0; i < diff; i++) {
          this.createResource();
        }
      }
    }
  };

  var slice = Array.prototype.slice;

  module.exports = {

    // Export the `Pool` constructor.
    Pool: Pool,

    // Export the PriorityQueue constructor, in case anyone wants to fiddle with that.
    PriorityQueue: PriorityQueue

  };

});

})(
  typeof define === 'function' && define.amd ? define : function (factory) { factory(require, exports, module); }
);