var fs = require('fs'),
	crypto = require('crypto'),
	_ = require('underscore'),
	async = require('async'),
	glob = require('glob'),
	validAlgorithms = ['md5', 'sha', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'];

function hashFiles(options, callback) {
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	if (!options || !callback) {
		throw new Error('Missing or invalid parameters');
	}

	var files = options.files || ['./**'],
		algorithm = options.algorithm || 'sha1',
		batchCount = options.batchCount || 100,
		globFunctions = [],
		readFileFunctions = [],
		handleGlob = function(file) {
			return function(cb) {
				glob(file, { mark: true }, cb);
			};
		},
		handleReadFile = function(file) {
			return function(cb) {
				fs.readFile(file, cb);
			};
		};

	if (validAlgorithms.indexOf(algorithm) < 0) {
		throw new Error('Invalid algorithm. Please use one of the following: ' + validAlgorithms.join(', '));
	}

	if (options.noGlob) {
		globFunctions.push(process.nextTick);
	}
	else {
		files.forEach(function(file) {
			globFunctions.push(handleGlob(file));
		});
	}
	async.parallelLimit(globFunctions, batchCount, function(err, results) {
		if (err) {
			return callback(err);
		}
		results = (options.noGlob) ? files : _.flatten(results, true);

		files = _.chain(results.sort())
					.unique(true)
					.filter(function(file) {
						return (file[file.length-1] !== '/');
					})
					.value();


		files.forEach(function(file) {
			readFileFunctions.push(handleReadFile(file));
		});

		async.parallelLimit(readFileFunctions, batchCount, function(err, fileDataList) {
			if (err) {
				return callback(err);
			}
			var hash = crypto.createHash(algorithm);
			hash.update(Buffer.concat(fileDataList));
			
			callback(null, hash.digest('hex'));
		});
	});
}

function hashFilesSync(options) {
	options = options || {};

	var files = options.files || ['./**'],
		allFiles = [],
		fileData = new Buffer(0),
		algorithm = options.algorithm || 'sha1';

	if (validAlgorithms.indexOf(algorithm) < 0) {
		throw new Error('Invalid algorithm. Please use one of the following: ' + validAlgorithms.join(', '));
	}

	if (!options.noGlob) {
		files.forEach(function(file) {
			allFiles = allFiles.concat(glob.sync(file, { mark: true }));
		});
		files = allFiles;
	}

	files = _.chain(files.sort())
				.unique(true)
				.filter(function(file) {
					return (file[file.length-1] !== '/');
				})
				.value();

	files.forEach(function(file) {
		fileData = Buffer.concat([fileData, fs.readFileSync(file)]);
	});

	var hash = crypto.createHash(algorithm);
	hash.update(fileData);
	
	return hash.digest('hex');
}

hashFiles.sync = hashFilesSync;

module.exports = hashFiles;