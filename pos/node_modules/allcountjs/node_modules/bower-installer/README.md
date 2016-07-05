bower-installer [![Build Status](https://travis-ci.org/blittle/bower-installer.png?branch=master)](https://travis-ci.org/blittle/bower-installer)
===============

Tool for installing bower dependencies that won't include entire repos. Although Bower works great
as a light-weight tool to quickly install browser dependencies, it currently does not provide much
functionality for installing specific "built" components for the client.

NOTE: Changed with v0.4.0 bower-installer will automatically run `bower install` before moving files around.

#Bower installs entire repositories

```javascript
{
  "name" : "test",
  "version": "0.1",
  "dependencies" : {
    "backbone" : "latest"
  }
}
```
If `bower install` is run on this configuration file, the entire backbone repository will be pulled down
and copied into a components directory. This repository is quite large, when probably only a built js and css
file are needed.  Bower conveniently provides the `bower list --paths` command to list the actual main files associated
with the components (if the component doesn't define a main, then the whole repository is listed instead).

#Bower Installer
Bower installer provides an easy way for the main files to be installed or moved to one or more locations. Simply add to
your bower.json an `install` key and `path` attribute:

```javascript
{
  "name" : "test",
  "version": "0.1",
  "dependencies" : {
    "backbone" : "latest"
  },
  "install" : {
    "path" : "some/path"
  }
}
```

Install bower-installer by executing

```bash
npm install -g bower-installer
```

From the terminal in the same directory as your bower.json file, enter:
```bash
bower-installer
```

After executing this, `backbone.js` will exist under `some/path` relative to the location of your
bower.json file.

#Overriding main files
A lot of registered components for bower do not include bower.json configuration. Therefore, bower does not know
about any "main files" and therefore, by default bower-installer doesn't know about them either. Bower-installer
can override an existing main file path or provide a non-existant one:

```javascript
{
  "name" : "test",
  "version": "0.1",
  "dependencies" : {
    "backbone" : "latest",
    "requirejs" : "latest"
  },
  "install" : {
    "path" : "some/path",
    "sources" : {
      "requirejs" : "bower_components/requirejs/require.js"
    }
  }
}
```
If bower installer is run on this configuration, `require.js` and `backbone.js` will all appear under
`some/path` relative to your bower.json file. 

#Install multiple main files
For one reason or another you may want to install multiple files from a single component. You can do this by providing
an `Array` instead of a `String` inside the sources hash. Or you can use file matchers [https://github.com/isaacs/minimatch](https://github.com/isaacs/minimatch):

```javascript
{
  "name" : "test",
  "version": "0.1",
  "dependencies" : {
    "jquery-ui" : "latest",
    "datejs": "*"
  },
  "install" : {
    "path" : "some/path",
    "sources" : {
      "jquery-ui" : [
        "bower_components/jquery-ui/ui/jquery-ui.custom.js",
        "bower_components/jquery-ui/themes/start/jquery-ui.css"
      ],
      "datejs": "bower_components/datejs/build/*.*"
    }
  }
}
```

#Install files to multiple locations
Files can be installed to multiple locations based upon file type. Do so by modifying the `path` to be a map of file-type
 locations. Example:
 ```javascript
{
  "name" : "test",
  "version": "0.1",
  "dependencies" : {
    "jquery-ui" : "latest"
  },
  "install" : {
    "path" : {
      "css": "src/css",
      "js": "src/js"
    },
    "sources" : {
      "jquery-ui" : [
        "components/jquery-ui/ui/jquery-ui.custom.js",
        "components/jquery-ui/themes/start/jquery-ui.css"
      ]
    }
  }
}
```

#Rename files during copy
Files can be renamed when bower-installer is copying them to their new destination. Do so by modifying the `mapping` object. Example:
 ```javascript
{
  "name" : "test",
  "version": "0.1",
  "dependencies" : {
    "jquery-ui" : "latest"
  },
  "install" : {
    "path" : "some/path",
    "sources" : {
      "jquery-ui" : {
        "mapping": [
          {"bower_components/jquery-ui/ui/jquery-ui.js": "jquery-ui.js"},
          {"bower_components/jquery-ui/ui/minified/jquery-ui.min.js": "jquery-ui-min-new-name.js"}
        ]
      }
    }
  }
}
```

#Ignore files
Files can be ignored and not copied. Do so by adding the appropriate keys to the `ignore` array. In the following example, `ember-model` has as dependency on `ember` and `handlebars`, so normally `ember` and the `handlebars` js files would be copied but in this case we don't want them copied over. Example:
 ```javascript
{
  "name" : "test",
  "version": "0.1",
  "dependencies": {
    "ember-model" : "0.0.8"
  },
  "install": {
    "path": "build/src",
    "ignore": ["ember", "handlebars"]
  }
}
```

#Benefits from glob patterns
You can specify a folder and get all files inside it preserving its folder structure.

```javascript
{
  "name" : "test",
  "version": "0.1",
  "dependencies": {
    "datatables-bootstrap3" : "latest"
  },
  "install": {
    "path": {
      "scss": "build/styles",
      "js": "build/js"
    }
    "sources" : {
      "datatables-bootstrap3" : "bower_components/datatables-bootstrap3/BS3/assets/**"
    }
  }
}
```

##Change log
 - 0.8.4 - Add silent option to avoid console.log output. #58
 - 0.8.3 - Path can now be blank, allowing for install into root of project. #59
 - 0.8.2 - Upgrade bower to fix underlying bugs.
 - 0.8.0 - Add an option for not removing the destination directories (--keep or -k). Preserve folder structures per extensions issue https://github.com/blittle/bower-installer/pull/52
 - 0.7.0 - Preserve folder structure when using glob patterns.
 - 0.6.1 - The commandline flag --remove or -r will remove the "bower_components" directory when installation completes.
 - 0.6.0 - Add file globbing and a travis-ci enabled test suite.
 - 0.5.0 - Add the ignore option
 - 0.4.0 - Remove file-utils dependency



[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/blittle/bower-installer/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

