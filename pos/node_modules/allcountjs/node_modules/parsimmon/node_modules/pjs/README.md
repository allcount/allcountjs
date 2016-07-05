[![Build Status](https://secure.travis-ci.org/jayferd/pjs.png)](http://travis-ci.org/jayferd/pjs)

# P.js

P.js is a lightweight layer over javascript's built-in inheritance system that keeps all the good stuff and hides all the crap.

## just show me some code already

Okay.

``` js
// adapted from coffeescript.org
// P.js exposes the `P` variable
var Animal = P(function(animal) {
  animal.init = function(name) { this.name = name; };

  animal.move = function(meters) {
    console.log(this.name+" moved "+meters+"m.");
  }
});

var Snake = P(Animal, function(snake, animal) {
  snake.move = function() {
    console.log("Slithering...");
    animal.move.call(this, 5);
  };
});

var Horse = P(Animal, function(horse, animal) {
  horse.move = function() {
    console.log("Galloping...");
    animal.move.call(this, 45);
  };
});

var sam = Snake("Sammy the Python")
  , tom = Horse("Tommy the Palomino")
;

sam.move()
tom.move()
```

## how is pjs different from X

Most class systems for JS let you define classes by passing an object.  P.js lets you pass a function instead, which allows you to closure private methods and macros.  It's also &lt;0.4kb minified (`make report`: 478).

### why doesn't pjs suck?

Unlike [some][prototypejs] [other][classjs] [frameworks][joose] [out][zjs] [there][structr], Pjs doesn't do any of this:

- interfaces, abstract static factory factories, [and][joose] [other][prototypejs] [bloat][zjs]
- use Object.create (it even works in IE &lt; 8!)
- break `instanceof`
- [hack functions onto `this` at runtime][classjs]
- rely on magical object keys which don't minify (the only special name is `init`)

[prototypejs]: http://prototypejs.org/learn/class-inheritance
[classjs]: https://github.com/kilhage/class.js
[zjs]: http://code.google.com/p/zjs/
[joose]: http://joose.it
[structr]: http://search.npmjs.org/#/structr

## what can i do with pjs?

- inheritable constructors (via the optional `init` method)
- closure-based "private" methods (see below)
- easily call `super` on public methods without any dirty hacks
- instantiate your objects without calling the constructor (absolutely necessary for inheritance)
- construct objects with variable arguments

## how do i use pjs?

You can call `P` in a few different ways:

``` js
// this defines a class that inherits directly from Object.
P(function(proto, super, class, superclass) {
  // define private methods as regular functions that take
  // `self` (or `me`, or `it`, or anything you really want)
  function myPrivateMethod(self, arg1, arg2) {
    // ...
  }

  proto.init = function() {
    myPrivateMethod(this, 1, 2)
  };

  // you can also return an object from this function, which will
  // be merged into the prototype.
  return { thing: 3 };
});

// this defines a class that inherits from MySuperclass
P(MySuperclass, function(proto, super, class, superclass) {
  proto.init = function() {
    // call superclass methods with super.method.call(this, ...)
    //                           or super.method.apply(this, arguments)
    super.init.call(this);
  };
});

// for shorthand, you can pass an object in lieu of the function argument,
// but you lose the niceness of super and private methods.
P({ init: function(a) { this.thing = a } });

MyClass = P(function(p) { p.init = function(a, b) { console.log("init!", a, b) }; });
// instantiate objects by calling the class as a function
MyClass(1, 2) // => init!, 1, 2

// to initialize with varargs, use `apply` like any other function.
var argsList = [1, 2];
MyClass.apply(null, argsList) // init!, 1, 2

// you can use it like an idiomatic class:
// `new` is optional, not really recommended.
new MyClass(1, 2) // => init!, 1, 2
// non-pjs idiomatic subclass
function Subclass(a) { MyClass.call(this, a, a); }
new Subclass(3) // => init!, 3, 3
new Subclass(3) instanceof MyClass // => true

// `new` may be used to "force" instantiation when ambiguous,
// for example in a factory method that creates new instances
MyClass.prototype.clone = function(a, b) {
  return new this.constructor(a, b);
};
// because without `new`, `this.constructor(a, b)` is equivalent to
// `MyClass.call(this, a, b)` which as we saw in the previous example
// mutates `this` rather than creating new instances

// allocate uninitialized objects with .Bare
// (much like Ruby's Class#allocate)
new MyClass.Bare // nothing logged
new MyClass.Bare instanceof MyClass // => true

// you can use `.open` to reopen a class.  This has the same behavior
// as the regular definitions.
// note that _super will still be set to the class's prototype
MyClass = P({ a: 1 });
var myInst = MyClass();
MyClass.open(function(proto) { proto.a = 2 });
myInst.a // => 2
MyClass.open(function(proto, _super) { /* _super is Object.prototype here */ });

// you can also use `.extend(definition)` to create new subclasses.  This is equivalent
// to calling P with two arguments.
var Subclass = MyClass.extend({ a: 3 });
```

## how do i use pjs in node.js?

Assuming you have it installed (via `npm install pjs`), you can import it with

``` js
var P = require('pjs').P;
```

and go about your business.

## what is all this Makefile stuff about

It's super useful! In addition to `make`, Pjs uses some build tools written on
[Node][]. With the [Node Package Manager][npm] that comes with recent versions
of it, just run

    npm install

from the root directory of the repo and `make` will start working.

[Node]: http://nodejs.org/#download
[npm]: http://npmjs.org

Here are the things you can build:

- `make minify`
    generates `build/p.min.js`

- `make commonjs`
    generates `build/p.commonjs.js`, which is the same but has `exports.P = P` at the end

- `make amd`
    generates `build/p.amd.js`, which is the same but has `define(P)` at the end

- `make test`
    runs the test suite using the commonjs version.  Requires `mocha`.
