var assert = require('assert'),
	rewire = require('rewire'),
	commander = rewire('commander'),
	opter = rewire('../lib/opter.js'),
	_ = require('underscore'),
	originalCommanderProps = Object.keys(commander),
	setCommandLineArgsAndEnvVars = function(args, envVars) {
		args = args || ['node', './test/opter.test.js'];
		envVars = envVars || {};
		commander.__set__('process', {
			argv: args,
			exit: function(){}
		});
		opter.__set__('process', {
			argv: args,
			env: envVars
		});
	},
	resetCommander = function() {
		commander.options = [];
		commander._events = {};
		for (var prop in commander) {
			if (commander.hasOwnProperty(prop)) {
				if (originalCommanderProps.indexOf(prop) < 0) {
					delete commander[prop];
				}
			}
		}
	};


opter.__set__('commander', commander);

afterEach(resetCommander);

describe('Opter Unit Tests', function() {

	it('should throw an error', function(done) {
		assert.throws(opter, /Missing/, 'throws missing arguments error');
		done();
	});

	it('should throw an error when 2 or more options use the same character', function(done) {

		assert.throws(function() {
			var cfg = opter({
				optA: {
					character: 'a',
				},
				optB: {
					character: 'a'
				}
			}, '0.1.0');
		}, /More than one option is attempting/, 'throws duplicate character error');
		done();
	});

	it('should read values from args', function(done) {

		setCommandLineArgsAndEnvVars([
			'node', './test/opter.test.js',
			'--my-option-from-args1', 'args1',
			'--my-option-from-args2', 'args2'
		]);

		var cfg = opter({
			myOptionFromArgs1: {
				defaultValue: 'default1',
				argument: 'string'
			},
			myOptionFromArgs2: {
				defaultValue: 'default2',
				argument: 'string'
			}
		}, '0.1.0');
		assert.strictEqual(cfg.myOptionFromArgs1, 'args1', 'myOptionFromArgs1 is: args1');
		assert.strictEqual(cfg.myOptionFromArgs2, 'args2', 'myOptionFromArgs2 is: args2');
		done();
	});

	it('should read empty string values from args', function(done) {

		setCommandLineArgsAndEnvVars([
			'node', './test/opter.test.js',
			'--my-option-from-args1', ''
		]);

		var cfg = opter({
			myOptionFromArgs1: {
				defaultValue: 'default1',
				argument: 'string'
			}
		}, '0.1.0');
		assert.strictEqual(cfg.myOptionFromArgs1, '', 'myOptionFromArgs1 is an empty string');
		done();
	});

	it('should read boolean values from args', function(done) {

		setCommandLineArgsAndEnvVars([
			'node', './test/opter.test.js',
			'--my-option-from-args1'
		]);

		var cfg = opter({
			myOptionFromArgs1: {
				defaultValue: false
			},
			myOptionFromArgs2: {
				defaultValue: false
			}
		}, '0.1.0');
		assert.strictEqual(cfg.myOptionFromArgs1, true, 'myOptionFromArgs1 is: true');
		assert.strictEqual(cfg.myOptionFromArgs2, false, 'myOptionFromArgs2 is: false');
		done();
	});

	it('should read values from args and convert types', function(done) {

		setCommandLineArgsAndEnvVars([
			'node', './test/opter.test.js',
			'--my-option-from-args1', '100',
			'--my-option-from-args2', 'true',
			'--my-option-from-args3', '0'
		]);

		var cfg = opter({
			myOptionFromArgs1: {
				defaultValue: '10',
				argument: 'number',
				schema: {
					type: 'number'
				}
			},
			myOptionFromArgs2: {
				defaultValue: 'false',
				schema: {
					type: 'boolean'
				}
			},
			myOptionFromArgs3: {
				defaultValue: '0',
				argument: 'string',
				schema: {
					type: 'string'
				}
			},
			myOptionFromArgs4: {
				defaultValue: '[]',
				argument: 'array',
				schema: {
					type: 'array'
				}
			},
			myOptionFromArgs5: {
				defaultValue: [],
				argument: 'array',
				schema: {
					type: 'array'
				}
			},
			myOptionFromArgs6: {
				defaultValue: '{}',
				argument: 'object',
				schema: {
					type: 'object'
				}
			},
			myOptionFromArgs7: {
				defaultValue: {},
				argument: 'object',
				schema: {
					type: 'object'
				}
			}
		}, '0.1.0');
		assert.strictEqual(cfg.myOptionFromArgs1, 100, 'myOptionFromArgs1 is: 100');
		assert.strictEqual(cfg.myOptionFromArgs2, true, 'myOptionFromArgs2 is: true');
		assert.strictEqual(cfg.myOptionFromArgs3, '0', 'myOptionFromArgs3 is : "0"');
		assert.strictEqual(cfg.myOptionFromArgs4 instanceof Array, true, 'expected value to be [], got: ' + JSON.stringify(cfg.myOptionFromArgs4));
		assert.strictEqual(cfg.myOptionFromArgs5 instanceof Array, true, 'expected value to be [], got: ' + JSON.stringify(cfg.myOptionFromArgs5));
		assert.strictEqual(cfg.myOptionFromArgs6 instanceof Object, true, 'expected value to be {}, got: ' + JSON.stringify(cfg.myOptionFromArgs6));
		assert.strictEqual(cfg.myOptionFromArgs7 instanceof Object, true, 'expected value to be {}, got: ' + JSON.stringify(cfg.myOptionFromArgs7));
		done();
	});

	it('should read values from env', function(done) {

		setCommandLineArgsAndEnvVars(null, {
			myOptionFromEnv1: 'env1',
			myOptionFromEnv2: 'env2'
		});

		var cfg = opter({
			myOptionFromEnv1: {
				defaultValue: 'default1',
				argument: 'string'
			},
			myOptionFromEnv2: {
				defaultValue: 'default2',
				argument: 'string'
			}
		}, '0.1.0');
		assert.strictEqual(cfg.myOptionFromEnv1, 'env1', 'myOptionFromEnv1 is: env1');
		assert.strictEqual(cfg.myOptionFromEnv2, 'env2', 'myOptionFromEnv2 is: env2');
		done();
	});

	it('should read values from env as all caps', function(done) {

		setCommandLineArgsAndEnvVars(null, {
			MYOPTIONFROMENV1: 'env1',
			MYOPTIONFROMENV2: 'env2'
		});

		var cfg = opter({
			myOptionFromEnv1: {
				defaultValue: 'default1',
				argument: 'string'
			},
			myOptionFromEnv2: {
				defaultValue: 'default2',
				argument: 'string'
			}
		}, '0.1.0');
		assert.strictEqual(cfg.myOptionFromEnv1, 'env1', 'MYOPTIONFROMENV1 is: env1');
		assert.strictEqual(cfg.myOptionFromEnv2, 'env2', 'MYOPTIONFROMENV2 is: env2');
		done();
	});

	it('should read values from default value', function(done) {

		setCommandLineArgsAndEnvVars();

		var cfg = opter({
			myOptionFromDefault1: {
				defaultValue: 'default1',
				argument: 'string'
			},
			myOptionFromDefault2: {
				defaultValue: 'default2',
				argument: 'string'
			}
		}, '0.1.0');
		assert.strictEqual(cfg.myOptionFromDefault1, 'default1', 'myOptionFromDefault1 is: default1');
		assert.strictEqual(cfg.myOptionFromDefault2, 'default2', 'myOptionFromDefault2 is: default2');
		done();
	});

	it('should read values from mixed places', function(done) {

		setCommandLineArgsAndEnvVars([
			'node', './test/opter.test.js',
			'--my-option-from-args1', 'args1'
		], {
			myOptionFromEnv1: 'env1'
		});

		var cfg = opter({
			myOptionFromArgs1: {
				defaultValue: 'default1',
				argument: 'string'
			},
			myOptionFromEnv1: {
				defaultValue: 'default2',
				argument: 'string'
			},
			myOptionFromDefault1: {
				defaultValue: 'default3',
				argument: 'string'
			}
		}, '0.1.0');
		assert.strictEqual(cfg.myOptionFromArgs1, 'args1', 'myOptionFromArgs1 is: args1');
		assert.strictEqual(cfg.myOptionFromEnv1, 'env1', 'myOptionFromEnv1 is: env1');
		assert.strictEqual(cfg.myOptionFromDefault1, 'default3', 'myOptionFromDefault1 is: default3');
		done();
	});

	it('should set options and description', function(done) {

		setCommandLineArgsAndEnvVars();

		var cfg = opter({
			myOptionFromDefault: {
				character: 'd',
				argument: 'string',
				defaultValue: 'default',
				schema: {
					description: 'some description.'
				}
			}
		}, '0.1.0');
		var mockedCommander = opter.__get__('commander');
		var expectedFlagsString = '-d, --my-option-from-default [string]';
		var expectedDesc = '(Optional) some description. Defaults to: "default"';
		var flagsMatch = _.find(mockedCommander.options, function(item) { return (item.flags === expectedFlagsString); });
		var descMatch = _.find(mockedCommander.options, function(item) { return (item.description === expectedDesc); });

		assert(flagsMatch, 'option string should show short option, long option, and argument');
		assert(descMatch, '(Optional) some description. Defaults to: "default"', 'description should show description and default value');
		done();
	});

	it('should throw an error if a required value is missing', function(done) {

		assert.throws(function() {
			var cfg = opter({
				optA: {
					character: 'a',
					argument: 'string',
					required: true
				}
			}, '0.1.0');
		}, /Option .*? is not set and is required/, 'throws error');
		done();
	});

	it('should not throw an error if a required value is missing, but has an implied default value since no argument was specified', function(done) {

		var cfg = opter({
				optA: {
					character: 'a',
					required: true
				}
			}, '0.1.0');
		done();
	});

	it('should not throw an error if an optional value is missing', function(done) {

		var cfg = opter({
				optA: {
					character: 'a',
					required: false
				}
			}, '0.1.0');
		done();
	});


	it('should throw an error if an argument value is not an object string, and type is Object', function(done) {

		assert.throws(function() {
			var cfg = opter({
				myOptionFromArgs6: {
					defaultValue: 'x',
					argument: 'object',
					schema: {
						type: 'object'
					}
				}
			}, '0.1.0');
		}, /Option .*? has a value that cannot be converted to an Object\/Array: .*?/, 'throws error');
		done();
	});

	it('should throw an error if an argument value is not an object, and type is Object', function(done) {

		assert.throws(function() {
			var cfg = opter({
				myOptionFromArgs6: {
					defaultValue: true,
					argument: 'object',
					schema: {
						type: 'object'
					}
				}
			}, '0.1.0');
		}, /Option .*? has a value is not an Object\/Array: .*?/, 'throws error');
		done();
	});

	it('should throw an error if the value does not match the schema', function(done) {

		assert.throws(function() {
			var cfg = opter({
				myOptionFromArgs6: {
					defaultValue: 'fnord',
					schema: {
						type: 'string',
						minLength: 10
					}
				}
			}, '0.1.0');
		}, 'throws error');
		done();
	});

	it('should not throw an error if an argument value is an object string, and type is Object', function(done) {

		var cfg = opter({
			myOptionFromArgs6: {
				defaultValue: [{"appName": "test"}],
				argument: 'object',
				schema: {
					type: 'array'
				}
			}
		}, '0.1.0');
		done();
	});

	it('should set options and description without default and argument', function(done) {

		setCommandLineArgsAndEnvVars();

		var cfg = opter({
			myOptionFromDefault: {
				character: 'd',
				schema: {
					description: 'some description.'
				}
			}
		}, '0.1.0');

		var mockedCommander = opter.__get__('commander');
		var expectedFlagsString = '-d, --my-option-from-default';
		var expectedDesc = '(Optional) some description.';
		var flagsMatch = _.find(mockedCommander.options, function(item) { return (item.flags === expectedFlagsString); });
		var descMatch = _.find(mockedCommander.options, function(item) { return (item.description === expectedDesc); });

		assert(flagsMatch, 'option string should show short option and long option');
		assert(descMatch, 'description should show description');
		done();
	});

	it('should automatically pick a character', function(done) {

		setCommandLineArgsAndEnvVars();

		var cfg = opter({
			myOptionFromDefault: { },
			mySecondOption: { },
			mySixthOption: { }
		}, '0.1.0');

		var mockedCommander = opter.__get__('commander');
		var expectedFlagsString = '-s, --my-sixth-option';
		var flagsMatch = _.find(mockedCommander.options, function(item) { return (item.flags === expectedFlagsString); });

		assert(flagsMatch, 'option string should show short option as "s"');
		resetCommander();

		cfg = opter({
			myOptionFromDefault: { },
			mySecondOption: { },
			mySixthOption: { },
			mySeventhOption: { }
		}, '0.1.0');

		expectedFlagsString = '-S, --my-seventh-option';
		flagsMatch = _.find(mockedCommander.options, function(item) { return (item.flags === expectedFlagsString); });

		assert(flagsMatch, 'option string should show short option as "S"');
		resetCommander();

		cfg = opter({
			myOptionFromDefault: { },
			mySecondOption: { },
			mySixthOption: { },
			mySeventhOption: { },
			mySixteenthOption: { },
			mySeventeenthOption: { },
			myStupidOption: { }
		}, '0.1.0');

		expectedFlagsString = '-y, --my-stupid-option';
		flagsMatch = _.find(mockedCommander.options, function(item) { return (item.flags === expectedFlagsString); });

		assert(flagsMatch, 'option string should show short option as "y"');
		resetCommander();

		cfg = opter({
			optA: { },
			optAa: { },
			optAaa: { },
			optAaaa: { },
			optAaaaa: { },
			optAaaaaa: { },
			optAaaaaaa: { },
			optAaaaaaaa: { },
			optAaaaaaaaa: { }
		}, '0.1.0');

		expectedFlagsString = '-b, --opt-aaaaaaaaa';
		flagsMatch = _.find(mockedCommander.options, function(item) { return (item.flags === expectedFlagsString); });

		assert(flagsMatch, 'option string should show short option as "b"');
		resetCommander();

		done();
	});

	it('should filter out invalid characters when attempting to pick one', function(done) {

		setCommandLineArgsAndEnvVars();

		var cfg = opter({
			a_b: { },
			a_c: { },
			a_d: { },
			'!%@#$thing': { },
			',./<>': { }
		}, '0.1.0');

		var mockedCommander = opter.__get__('commander');
		var expectedFlagsString = '-d, --a_d';
		var flagsMatch = _.find(mockedCommander.options, function(item) { return (item.flags === expectedFlagsString); });
		assert(flagsMatch, 'option string should show short option as "d"');

		expectedFlagsString = '-t, --!%@#$thing';
		flagsMatch = _.find(mockedCommander.options, function(item) { return (item.flags === expectedFlagsString); });
		assert(flagsMatch, 'option string should show short option as "t"');

		expectedFlagsString = '-b, --,./<>';
		flagsMatch = _.find(mockedCommander.options, function(item) { return (item.flags === expectedFlagsString); });
		assert(flagsMatch, 'option string should show short option as "b"');

		resetCommander();

		done();
	});

	it('should read config from an opter.json file', function(done) {

		// change the location of the "running file"
		setCommandLineArgsAndEnvVars(['node', __dirname + '/support/opter.test.js']);
		var cfg = opter({
			myOptionFromFile: {
				defaultValue: 'default1',
				argument: 'string'
			},
			myOptionFromFile2: {
				defaultValue: 'default2',
				argument: 'string'
			},
			nested: {
				defaultValue: {}
			}
		}, '0.1.0');
		assert.strictEqual(cfg.myOptionFromFile, 'fnord1', 'myOptionFromFile is: fnord1');
		assert.strictEqual(cfg.myOptionFromFile2, 'fnord2', 'myOptionFromFile2 is: fnord2');
		assert.strictEqual(cfg.nested.config.file, 'fnord3', 'nested.config.file is: fnord3');
		assert.strictEqual(cfg.ignored, undefined, 'ignored is undefined');
		done();
	});

	it('should read config from a specified file', function(done) {

		// change the location of the "running file"
		setCommandLineArgsAndEnvVars(['node', __dirname + '/support/opter.test.js']);
		var cfg = opter({
			myOptionFromDifferentFile: {
				defaultValue: 'default1',
				argument: 'string'
			},
			myOptionFromDifferentFile2: {
				defaultValue: 'default2',
				argument: 'string'
			}
		}, '0.1.0', './other.json');
		assert.strictEqual(cfg.myOptionFromDifferentFile, 'fnord10', 'myOptionFromDifferentFile is: fnord10');
		assert.strictEqual(cfg.myOptionFromDifferentFile2, 'fnord20', 'myOptionFromDifferentFile2 is: fnord20');
		done();
	});

	it('should read config from a specified YAML file', function(done) {

		// change the location of the "running file"
		setCommandLineArgsAndEnvVars(['node', __dirname + '/support/opter.test.js']);
		var cfg = opter({
			myOptionFromFile: {
				defaultValue: 'default1',
				argument: 'string'
			},
			myOptionFromFile2: {
				defaultValue: 'default2',
				argument: 'string'
			},
			nested: {
				defaultValue: {}
			}
		}, '0.1.0', './opter.yml');
		assert.strictEqual(cfg.myOptionFromFile, 'fnord1', 'myOptionFromFile is: fnord1');
		assert.strictEqual(cfg.myOptionFromFile2, 'fnord2', 'myOptionFromFile2 is: fnord2');
		assert.strictEqual(cfg.nested.config.file, 'fnord3', 'nested.config.file is: fnord3');
		assert.strictEqual(cfg.ignored, undefined, 'ignored is undefined');
		done();
	});

	it('should read nested config from any place', function(done) {

		// change the location of the "running file"
		setCommandLineArgsAndEnvVars([
			'node', __dirname + '/support/opter.test.js',
			'--nested.config.args', 'args1'
		], {
			nested_config_env: 'env1'
		});

		var cfg = opter({
			'nested.config.file': {
				defaultValue: 'default1',
				argument: 'string'
			},
			'nested.config.args': {
				defaultValue: 'default2',
				argument: 'string'
			},
			'nested.config.env': {
				defaultValue: 'default3',
				argument: 'string'
			}
		}, '0.1.0');
		assert.strictEqual(cfg.nested.config.file, 'fnord3', 'nested.config.file is: fnord3');
		assert.strictEqual(cfg.nested.config.args, 'args1', 'nested.config.args is: args1');
		assert.strictEqual(cfg.nested.config.env, 'env1', 'myOptionFromEnv2 is: env1');
		done();
	});



});