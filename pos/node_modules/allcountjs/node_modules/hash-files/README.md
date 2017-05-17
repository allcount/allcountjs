# hash-files

A simple function for computing the hash of the contents of a set of files.


[![Build Status](https://secure.travis-ci.org/mac-/hash-files.png)](http://travis-ci.org/mac-/hash-files)
[![Coverage Status](https://coveralls.io/repos/mac-/hash-files/badge.png)](https://coveralls.io/r/mac-/hash-files)
[![NPM version](https://badge.fury.io/js/hash-files.png)](http://badge.fury.io/js/hash-files)
[![Dependency Status](https://david-dm.org/mac-/hash-files.png)](https://david-dm.org/mac-/hash-files)

[![NPM](https://nodei.co/npm/hash-files.png?downloads=true&stars=true)](https://nodei.co/npm/hash-files/)

## Installation

	npm install hash-files

## Usage

```js
var hashFiles = require('hash-files');

// options is optional
hashFiles(options, function(error, hash) {
	// hash will be a string if no error occurred
});
```

Or on the command line:

```shell
$ ./bin/hash-files -h

  Usage: hash-files [options]

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -f, --files [array]         (Optional) A collection of file paths to hash the contents of. Defaults to: ./**
    -a, --algorithm [string]    (Optional) The algorithm to use to hash the content. Defaults to: "sha1"
    -n, --no-glob               (Optional) Use this if you know all of the files in the collection are exact paths. Setting this to true speeds up the call slightly. Defaults to: false
    -c, --batch-count [number]  (Optional) The maximum number of files to read into memory at any given time. Defaults to: 100
```

```shell
$ ./bin/hash-files -f '["package.json"]' -a sha256
a29089cc5e3f8bf6ae15ea6b9cd5eaefb14bbb12e3baa2c56ee5c21422250c75
```

### hashFiles([options], callback)

Performs a hash of the contents of the given files ansynchronously.

* `options` - (Object) see below for more details
* `callback` - (Function) called when an error occurs or the hash is completed. Should expect the following arguments:
	* `error` - (Error or null) the error the occurred while hashing the contents of the given files or null if there was no error
	* `hash` - (String) the value of the computed hash

### hashFiles.sync([options])

Performs a hash of the contents of the given files synchronously.

* `options` - (Object) see below for more details
* returns `hash` - (String) the value of the computed hash

### Options

* `files` - (optional) A collection of file paths to hash the contents of. Defaults to `['./**']` (all the files in the current working directory)
* `algorithm` - (optional) The algorithm to use to hash the content: 'md5', 'sha', 'sha1', 'sha224', 'sha256', 'sha384', or 'sha512'. Defaults to 'sha1'.
* `noGlob` - (optional) Don't bother running a glob function on the files. Use this if you know all of the files in the collection are exact paths. Setting this to `true` speeds up the call slightly.
* `batchCount` - (optional) Only used for the ansyc function. The maximum number of files to read into memory at any given time. Defaults to 100.


## License

The MIT License (MIT) Copyright (c) 2013 Mac Angell

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

