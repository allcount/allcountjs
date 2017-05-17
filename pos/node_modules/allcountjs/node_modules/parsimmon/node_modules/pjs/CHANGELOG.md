## version 5.1.1: 2014-06-25

  * Update name, email, and repository for npm

## version 5.1.0: 2014-03-09

  * Statically distribute build/p.commonjs.js

## version 5.0.0: 2013-10-27

  * Allow idiomatic (coffeescript or es6) subclassing of pjs classes, at the
    cost of subtly breaking back-compat with `this.constructor(...)`.  To fix
    this, just put a `new` in front of the call.

## version 4.0.0: 2013-06-13

  * remove .mixin, and add .extend (see #18)

## version 3.1.0: 2013-06-13

  * Add .p as an alias for .prototype
  * slight minifier optimization

## version 3.0.2: 2013-04-04

  * Build process fixes (thanks @danro!)
  * rename BareConstructor to SuperclassBare (@laughinghan)

## version 3.0.1: 2013-01-28
(bad release)

  * Fix #13: don't call the constructor when making the new prototype.

## version 3.0.0: 2013-01-18

  * Introduce `MyClass.Bare` as a way of allocating uninitialized
    instances
  * Created classes will now create instances in exactly the same way
    no matter what the calling context.  In particular this means
    `new` works as expected:

``` js
new MyClass(1, 2) // calls MyClass::init with arguments (1, 2)
```

## version 2.0.2: 2013-01-17

  * Started a CHANGELOG
  * Removed support for the `.fn` property which was buggy and unused
  * Down to 525 bytes minified
