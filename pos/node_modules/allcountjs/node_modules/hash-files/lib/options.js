module.exports = {
	files: {
		character: 'f',
		argument: 'array',
		defaultValue: ['./**'],
		required: false,
		schema: {
			type: 'array',
			description: 'A collection of file paths to hash the contents of.'
		}
	},
	algorithm: {
		character: 'a',
		argument: 'string',
		defaultValue: 'sha1',
		required: false,
		schema: {
			enum: ['md5', 'sha', 'sha1', 'sha224', 'sha256', 'sha384','sha512'],
			description: 'The algorithm to use to hash the content.'
		}
	},
	noGlob: {
		character: 'n',
		defaultValue: false,
		required: false,
		schema: {
			type: 'boolean',
			description: 'Use this if you know all of the files in the collection are exact paths. Setting this to true speeds up the call slightly.'
		}
	},
	batchCount: {
		character: 'c',
		argument: 'number',
		defaultValue: 100,
		required: false,
		schema: {
			type: 'number',
			description: 'The maximum number of files to read into memory at any given time.'
		}
	}
};