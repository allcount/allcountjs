# What is AllcountJS

AllcountJS is an application framework aimed for rapid development of business applications.
The main idea is to make application development fully declarative and reduce application configuration to minimum possible amount.

# Try it

- [Run application demo](http://allcountjs.com/#demo)

# Documentation

- [Getting Started](http://allcountjs.com/docs/getting-started)
- [Application Configuration](http://allcountjs.com/docs/apps)
- [Extending](http://allcountjs.com/docs/server)

# Install
Before we start you should install [Node.js](http://nodejs.org/) and [MongoDB](http://www.mongodb.org/).
After that in order to install AllcountJS server you should run from CLI:

```
npm install -g allcountjs
```

> *NOTE:* There could be an EACCES issue with bower install on Mac OS X.
As workaround please remove bower cache with `bower cache clean` and run `npm install allcountjs` to pre load it.

# Running Hello World
AllcountJS server uses Git repositories to load app configurations from it and MongoDB to store application data.
To run AllcountJS Git should be installed and available in path.
Create empty repository directory with

```
mkdir allcountjs-helloworld
cd allcountjs-helloworld
git init
```

Create `helloworld-app.js` with following content in created dir

```js
A.app({
  appName: "Hello World",
  menuItems: [
    {
      name: "Hello world",
      entityTypeId: "HelloWorld",
    }
  ],
  entities: function(Fields) {
    return {
      HelloWorld: {
        fields: {
          foo: Fields.text("Foo"),
          bar: Fields.date("Bar")
        }
      }
    }
  }
});
```

Commit it with

```
git add .
git commit -m "Initial commit"
```

Then run it with

```
allcountjs --git file://<path to allcountjs-helloworld> --db mongodb://localhost:27017/allcountjs-helloworld
```

Please note that MongoDB should be running in order to run this example.

# License
AllcountJS is licensed under the MIT Open Source license. For more information, see the LICENSE file in this repository.