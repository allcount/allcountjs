# opter

Opter provides an easy way to specify options for your application. It uses [commander](https://github.com/visionmedia/commander.js) to parse command line arguments and display option help information. In addition to reading from command line options, it can also read values from environment variables and a json/yaml file (opter.json) that lives in the same directory as the file being run by NodeJS. If no values were found in the command line arguments, environment variables, or the JSON/YAML config file, then it will assign the default value (if provided). The priority is:

1. command line args
2. environment variables
3. JSON/YAML config file
4. default value

[![Build Status](https://secure.travis-ci.org/mac-/opter.png)](http://travis-ci.org/mac-/opter)
[![Coverage Status](https://coveralls.io/repos/mac-/opter/badge.png)](https://coveralls.io/r/mac-/opter)
[![Code Climate](https://codeclimate.com/github/mac-/opter.png)](https://codeclimate.com/github/mac-/opter)
[![NPM version](https://badge.fury.io/js/opter.png)](http://badge.fury.io/js/opter)
[![Dependency Status](https://david-dm.org/mac-/opter.png)](https://david-dm.org/mac-/opter)

[![NPM](https://nodei.co/npm/opter.png?downloads=true&stars=true)](https://nodei.co/npm/opter/)

## Contributing

This module makes use of a `Makefile` for building/testing purposes. After obtaining a copy of the repo, run the following commands to make sure everything is in working condition before you start your work:

	make install
	make test

Before committing a change to your fork/branch, run the following commands to make sure nothing is broken:

	make test
	make test-cov

Don't forget to bump the version in the `package.json` using the [semver](http://semver.org/spec/v2.0.0.html) spec as a guide for which part to bump. Submit a pull request when your work is complete.

***Notes:***
* Please do your best to ensure the code coverage does not drop. If new unit tests are required to maintain the same level of coverage, please include those in your pull request.
* Please follow the same coding/formatting practices that have been established in the module.

## Installation

	npm install opter

## Usage

The opter function takes three parameters:

* An object containing the options to configure
* The version of your app (easily retrieved by running ```require('./package.json').version```)
* [optional] A location to a file that contains the config to read. Note: Command line options and env vars trump any values in this file. If not specified, it defaults to a file called `opter.json`. All relative paths are assumed to be relative the file being executed by Node.

The object containing the options should be formatted like so:

	{
		myOption: {					// correlates to command line option "--my-option" and environment variable "myOption" and environment variable "MYOPTION" and opter.json property "myOption"
			character: 'm',			// optional, used as the short option for the command line. If not provided opter will try to pick one for you based on your option name.
			argument: 'string',		// optional, describes what the value should be. If not provided, it defaults to the "type" within the schema if set, otherwise to "string". If the schema type is "boolean", no argument is required.
			defaultValue: 'fnord',	// optional, the value to set the option to if it wasn't specified in the args or env vars
			required: true, 		// optional, if set to true and no value is found, opter will throw an error. defaults to false.
			schema: {				// optional, a JSONSchema definition to validate the value against. If the "type" property is used, opter will also try to convert the value to that type before validating it.
				type: 'string',		// optional, the type that the value should conform to
				description: ''		// optional, describes the option and is used when generating the command line help
			}				
		}
	}

Note: If `argument` is missing or falsey and `type` is not `Boolean`, an error will be thrown.

The function returns an object containing the keys that were specified in the options that were passed along with the values that opter found from the args, env vars, or default values. For example, calling the opter function with the above sample options object, the result might look like:

	{
		myOption: 'fnord'
	}

Here is an example on how to use opter:

	// app.js
	var opter = require('opter'),
		appVersion = require('./package.json').version,
		opts = {
			myOption: {}
		},
		options = opter(opts, appVersion);

With the example above, here are some sample ways to invoke the app:

	$ node app.js -m test
	$ node app.js --my-option test
	$ export myOption=test && node app.js
	$ node app.js -h
	$ node app.js -V

When an app using opter is run with the "-h" option, something similar will be displayed in the console:

```
$ node app.js -h

  Usage: app.js [options]

  Options:

    -h, --help                          output usage information
    -V, --version                       output the version number
    -m, --my-option <value>             (Optional) Enables some cool funcitonality. Defaults to: true
```

Here is an example opter.json file:

	{
		"myOption": "fnord"
	}

### Nested Options

You can also specify option names with dots (.) to denote a nested property within your `opter.json` file. However, when using dots in the name, the environment variable will have the dots replaced with underscores (_). Here is an example:


Opter options:

```
{
	'statsd.host': {
		character: 's',
		argument: 'host',
		defaultValue: 'localhost:8125'
	},
	'statsd.prefix': {
		chatacter: 'S',
		argument: 'string'
	}
};

```

Corresponding commandline arguments:

```
... --statsd.host=localhost:8125 --statsd.prefix=myApp
```

Corresponding environment variables:

```
statsd_host=localhost:8125
statsd_prefix=myApp
```

Corresponding opter.json:

```
{
	statsd: {
		host: 'localhost:8125',
		prefix: 'myApp'
	}
}
```

The object returned by the opter function:

```
{
	statsd: {
		host: 'localhost:8125',
		prefix: 'myApp'
	}
}
```

As you can see, the object returned by opter will look identical to what you put in the `opter.json` file, as long as ll the properties in the opter.json file match the configuration options passed to the opter method.

## License

The MIT License (MIT) Copyright (c) 2013 Mac Angell

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
