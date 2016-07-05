var commander = require('commander'),
	objPath = require('object-path'),
	path = require('path'),
	fs = require('fs'),
	yaml = require('js-yaml'),
	ZSchema = require('z-schema'),
	ZSchemaErrors = require('z-schema-errors'),
	validator = new ZSchema(),
	reporter = ZSchemaErrors.init();

/*
	example options object:
	{
		option1: {
			charater: 'o',
			argument: 'value',
			defaultValue: '',
			required: true,
			schema: {
				type: 'boolean',
				description: 'an option'
			}
		},
		options2: {
			charater: 'O',
			argument: 'value',
			defaultValue: 10,
			schema: {
				type: 'integer',
				description: 'another option'
			}
		}
	}
*/
module.exports = function (options, appVersion, opterFileLocation) {
	if (!options || !appVersion) {
		throw new Error('Missing arguments');
	}
	commander
		.version(appVersion)
		.usage('[options]');

	var config = {},
		option,
		optName,
		requiredText,
		description,
		longOptionStr,
		configFile = {},
		character,
		allCharacters = 'abcdefgijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUWXYZ',
		usedCharacters = { h: true, V: true },
		isValidCharacter = function(char) {
			return (allCharacters.indexOf(char) !== -1);
		},
		getCharacterForOption = function (optName) {
			var i, moreChars, ch,
				firstCharLC = optName[0].toLowerCase(),
				firstCharUC = optName[0].toUpperCase();
			
			// try the first character in the option name
			if (!usedCharacters[firstCharLC] && isValidCharacter(firstCharLC)) {
				ch = firstCharLC;
			}
			// try the first character in the option name (upper case)
			else if (!usedCharacters[firstCharUC] && isValidCharacter(firstCharUC)) {
				ch = firstCharUC;
			}
			else {
				// try the any of the upper case letters in the option name
				moreChars = optName.match(/[A-Z]/g);
				if (moreChars) {
					for (i = 0; i < moreChars.length; i++) {
						if (!usedCharacters[moreChars[i].toLowerCase()]) {
							ch = moreChars[i].toLowerCase();
							break;
						}
						else if (!usedCharacters[moreChars[i]]) {
							ch = moreChars[i];
							break;
						}
					}
				}
				if (!ch) {
					var testCharLC, testCharUC;
					// try the any character in the option name
					for (i = 1; i < optName.length; i++) {
						testCharLC = optName[i].toLowerCase();
						testCharUC = optName[i].toUpperCase();
						if (!usedCharacters[testCharLC] && isValidCharacter(testCharLC)) {
							ch = testCharLC;
							break;
						}
						else if (!usedCharacters[testCharUC] && isValidCharacter(testCharUC)) {
							ch = testCharUC;
							break;
						}
					}
					// pick any character from the alphabet that hasn't been used
					if (!ch) {
						for (i = 1; i < allCharacters.length; i++) {
							if (!usedCharacters[allCharacters[i]]) {
								ch = allCharacters[i];
								break;
							}
						}
						// uh oh
						if (!ch) {
							throw new Error('There are no valid characters left. Consider reducing the number of options you have.');
						}
					}
				}
			}
			usedCharacters[ch] = true;
			return ch;
		};

	for (optName in options) {
		if (options.hasOwnProperty(optName)) {
			option = options[optName];
			if (option.hasOwnProperty('character')) {
				if (usedCharacters[option.character]) {
					throw new Error('More than one option is attempting to use the same character ("' + option.character + '"). Please choose unique characters for your options.');
				}
				usedCharacters[option.character] = true;
			}
		}
	}
	for (optName in options) {
		if (options.hasOwnProperty(optName)) {
			option = options[optName];

			if (option.hasOwnProperty('schema') && option.schema.type && option.schema.type !== 'boolean') {
				option.argument = option.schema.type;
			}
			requiredText = (option.required) ? '(Required) ' : '(Optional) ';
			description = (option.hasOwnProperty('schema') && option.schema.description) ? option.schema.description : 'No Description.';
			description = requiredText + description;
			if (option.hasOwnProperty('defaultValue') && option.defaultValue !== null) {
				description += ' Defaults to: ';
				description += (typeof(option.defaultValue) === 'string') ? '"' + option.defaultValue + '"' : option.defaultValue;
			}
			longOptionStr = optName.replace(/([A-Z])/g, function (match) { return '-' + match.toLowerCase(); });
			var argOpenChar = (option.required) ? '<' : '[',
				argCloseChar = (option.required) ? '>' : ']';
			longOptionStr = (option.argument) ? longOptionStr + ' ' + argOpenChar + option.argument + argCloseChar : longOptionStr;

			// if no argument was specified, then this is a boolean flag, and therefore should default to false, if not specified otherwise
			if (!option.argument) {
				option.defaultValue = option.defaultValue || false;
			}
			// if no character was supplied, let's try to pick one
			if (!option.hasOwnProperty('character')) {
				character = getCharacterForOption(optName);
			}
			else {
				character = option.character;
			}

			commander.option('-' + character + ', --' + longOptionStr, description);

		}
	}

	// parse options form arguments
	commander.parse(process.argv);

	// look for opter.json as a sibling to the file currently being executed
	if (process.argv[1]) {
		var basePath = process.argv[1].substr(0, process.argv[1].lastIndexOf('/') + 1);
		if (opterFileLocation) {
			opterFileLocation = (opterFileLocation.indexOf(path.sep) === 0) ? opterFileLocation : basePath + opterFileLocation;
		}
		configFile = opterFileLocation || basePath + 'opter.json';
		try {
			fs.statSync(configFile);
			if (path.extname(configFile) === '.yml' || path.extname(configFile) === '.yaml') {
				configFile = yaml.safeLoad(fs.readFileSync(configFile, 'utf8'));
			}
			else {
				configFile = require(configFile);
			}
		}
		catch (ex) {
			configFile = {};
		}
	}

	// save options to config obj (from command line first, env vars second, opter.json third, and defaults last)
	for (optName in options) {
		if (options.hasOwnProperty(optName)) {
			option = options[optName];
			var value = commander[optName];
			if (value === undefined) {
				value = process.env[optName.replace(/\./g, '_')] || process.env[optName.replace(/\./g, '_').toUpperCase()];
				if (value === undefined) {
					value = objPath.get(configFile, optName);
					if (value === undefined) {
						value = option.defaultValue;
					}
				}
			}
			if (option.hasOwnProperty('schema')) {
				// if type is defined, try to convert the value to the specified type
				if (option.schema.hasOwnProperty('type')) {
					switch (option.schema.type) {

						case 'boolean':
							value = (value === 'true') || (value === true);
							break;

						case 'number':
						case 'integer':
							// fastest, most reliable way to convert a string to a valid number
							value = 1 * value;
							break;

						case 'object':
						case 'array':
							if (typeof value === 'string') {
								try {
									value = JSON.parse(value);
								} catch (e) {
									throw new Error('Option "' + optName + '" has a value that cannot be converted to an Object/Array: ' + value);
								}
							} else {
								if (typeof value !== 'object') {
									throw new Error('Option "' + optName + '" has a value is not an Object/Array: ' + value);
								}
							}
							break;

						default:
							value = (value !== null && value !== undefined) ? value.toString() : value;
					}
				}
				// validate the value against the schema
				var isValid = validator.validate(value, option.schema);
				if (!isValid) {
					var errorMsg = reporter.extractMessage(validator.lastReport);
					throw new Error(errorMsg);
				}

			}
			if (value === undefined && option.required) {
				throw new Error('Option "' + optName + '" is not set and is required.');
			}
			objPath.set(config, optName, value);
		}
	}
	return config;
};