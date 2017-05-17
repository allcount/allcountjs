var assert = require('assert')
  , P = require('./../index').P
;

describe('P', function() {
  describe('creating idiomatic classes', function() {
    var MyClass = P(function(p) {
      p.foo = 1
    });

    it('creates functions', function() {
      assert.equal('function', typeof MyClass);
    });

    it('uses the prototype', function() {
      assert.equal(1, MyClass.prototype.foo);
    });

    it('respects `instanceof`', function() {
      assert.ok(new MyClass instanceof MyClass);
      assert.ok(MyClass() instanceof MyClass);
    });

    it('respects `.constructor`', function() {
      var o = MyClass();
      assert.ok(o.constructor === MyClass);

      var o2 = new o.constructor();
      assert.ok(o2 instanceof MyClass);
      assert.ok(o2.foo === 1);

      var o3 = o.constructor.call(null);
      assert.ok(o3 instanceof MyClass);
      assert.ok(o3.foo === 1);
    });
  });

  describe('init', function() {
    var MyClass = P(function(p) {
      p.init = function() {
        this.initCalled = true;
        this.initArgs = arguments;
      };

      p.initCalled = false;
    });

    it('is called when the class is called plainly', function() {
      assert.ok(MyClass().initCalled);
      assert.equal(3, MyClass(1,2,3).initArgs[2]);
      assert.equal(2, MyClass.apply(null, [1, 2, 3]).initArgs[1]);
    });

    it('is called when the class is called with `new`', function() {
      assert.ok((new MyClass).initCalled);
      assert.equal(3, (new MyClass(1,2,3)).initArgs[2]);
    });

    it('is not called when the Bare class is called with `new`', function() {
      assert.ok(!(new MyClass.Bare).initCalled);
    });

    it('maintains instanceof when instantiated with Bare', function() {
      assert.ok(new MyClass.Bare instanceof MyClass);
    });
  });

  describe('inheritance', function() {
    // see examples/ninja.js
    var Person = P(function(person) {
      person.init = function(isDancing) { this.dancing = isDancing };
      person.dance = function() { return this.dancing };
    });

    var Ninja = P(Person, function(ninja, person) {
      ninja.init = function() { person.init.call(this, false) };
      ninja.swingSword = function() { return 'swinging sword!' };
    });

    var ninja = Ninja();

    it('respects instanceof', function() {
      assert.ok(ninja instanceof Person);
    });

    it('inherits methods (also super)', function() {
      assert.equal(false, ninja.dance());
    });
  });

  describe('inheriting non-pjs classes', function() {
    function IdiomaticClass() {
      this.initialized = true;
    }

    IdiomaticClass.prototype.initialized = false;

    it('inherits without calling the constructor', function() {
      var MySubclass = P(IdiomaticClass, {});
      assert.equal(false, MySubclass.prototype.initialized);
      assert.equal(true, MySubclass().initialized);
    });
  });

  // for coffeescript or es6 subclassing of pjs classes
  describe('idiomatic subclassing of Pjs classes', function() {
    var MyClass = P({
      init: function() { this.initCalled = true; },
      initCalled: false,
      foo: 3
    });

    function IdiomaticSubclass() {
      MyClass.call(this);
    }

    // coffeescript does something slightly different here with __extends,
    // but it's the same behavior
    IdiomaticSubclass.prototype = new MyClass.Bare;

    it('inherits properly', function() {
      var obj = new IdiomaticSubclass();
      assert.ok(obj instanceof IdiomaticSubclass);
      assert.ok(obj instanceof MyClass);
      assert.equal(true, obj.initCalled);
      assert.equal(3, obj.foo)
    });
  });

  describe('inheriting builtins', function() {
    describe('Error', function() {
      var MyError = P(Error, {});

      try {
        throw MyError('o noes');
      } catch(e) {
        assert.ok(e instanceof MyError);
        assert.ok(e instanceof Error);
      }
    });

    describe('RegExp', function() {
      var MyRegExp = P(RegExp, {})
        , re = MyRegExp('a(b+)c')
      ;

      assert.ok(re instanceof RegExp);
      // pending: doesn't work yet
      // assert.ok(MyRegExp('a(b+)c').test('abbbbc'))
    });

    describe('String', function() {
      var MyString = P(String, {})
        , str = MyString('foo')
      ;

      assert.ok(str instanceof String);
      // pending: doesn't work yet
      // assert.equal('foo', str.toString());
    });

    describe('Array', function() {
      var MyArray = P(Array, {})
        , ary = MyArray(1,2,3)
      ;

      assert.ok(ary instanceof Array);
      // apparently the Array constructor isn't destructive :(
      // when you `apply` it to an instance of Array, it just creates
      // a new one for you.  Bah.

      // assert.equal(3, ary.length);
      // assert.equal(1, ary[0]);
    });
  });

  describe('definition', function() {
    it('passes the prototype as the first arg', function() {
      var proto;
      var MyClass = P(function(p) { proto = p; });

      assert.equal(proto, MyClass.prototype);
    });

    it('passes the superclass prototype as the second arg', function() {
      var _super;
      P(Error, function(a, b) { _super = b; });
      assert.equal(_super, Error.prototype);
    });

    it('passes the class itself as the third arg', function() {
      var klass;
      var MyClass = P(function(a, b, c) { klass = c; });

      assert.equal(klass, MyClass);
    });

    it('passes the superclass as the fourth argument', function() {
      var sclass;
      var MyClass = P(function(a, b, c, d) { sclass = d; });
      assert.equal(Object, sclass);

      P(MyClass, function(a, b, c, d) { sclass = d; });
      assert.equal(MyClass, sclass);
    });

    it('passes the class itself as `this`', function() {
      var klass;
      var MyClass = P(function() { klass = this; });
      assert.equal(MyClass, klass);
    });

  });

  describe('open', function() {
    var C = P();

    it('reopens the class, affecting existing instances', function() {
      C.open({ a: 1 });
      var inst = C();
      C.open({ a: 2 });

      assert.equal(inst.a, 2);
    });
  });

  describe('extend', function() {
    var C = P();
    var count = 0;
    it('extends the class', function() {
      var mixin1 = function(proto) {
        proto.foo = 1;
      };

      var mixin2 = { foo: 2 };

      assert.equal(C().foo, undefined);

      assert.equal(C.extend(mixin1)().foo, 1);

      // chainable!
      assert.equal(C.extend(mixin1).extend(mixin2)().foo, 2);
    });

    it('supports _super', function() {
      var mixin1 = function(proto) {
        proto.foo = function() { return 1 };
      }

      var mixin2 = function(proto, _super) {
        proto.foo = function() { return _super.foo.call(this) + 1 };
      }

      assert.equal(C.extend(mixin1).extend(mixin2)().foo(), 2);
    });
  });
});
