/*!
 * JUST JavaScript template engine v0.1.8
 * https://github.com/baryshev/just
 *
 * Copyright 2012, Vadim M. Baryshev <vadimbaryshev@gmail.com>
 * Licensed under the MIT license
 * https://github.com/baryshev/just/LICENSE
 *
 * Includes parts of async
 * https://github.com/caolan/async
 * Copyright 2010 Caolan McMahon
 * Released under the MIT license
 *
 * Includes parts of node
 * https://github.com/joyent/node
 * Copyright Joyent, Inc. and other Node contributors
 * Released under the MIT license
 *
 * Includes Cross-Browser Split 1.0.1
 * http://xregexp.com/
 * Copyright Steven Levithan <stevenlevithan.com>
 * Released under the MIT license
 */
(function () {
	'use strict';
	var
		fs,
		path,
		async = (function () {
			var
				async = {},
				forEach = function (arr, iterator) {
					var i;
					if (arr.forEach) {
						return arr.forEach(iterator);
					}
					for (i = 0; i < arr.length; i++) {
						iterator(arr[i], i, arr);
					}
				},
				map = function (arr, iterator) {
					if (arr.map) {
						return arr.map(iterator);
					}
					var results = [];
					forEach(arr, function (x, i, a) {
						results.push(iterator(x, i, a));
					});
					return results;
				},
				asyncMap = function (eachfn, arr, iterator, callback) {
					var results = [];
					arr = map(arr, function (x, i) {
						return {index: i, value: x};
					});
					eachfn(arr, function (x, callback) {
						iterator(x.value, function (err, v) {
							results[x.index] = v;
							callback(err);
						});
					}, function (err) {
						callback(err, results);
					});
				},
				doParallel = function (fn) {
					return function () {
						var args = Array.prototype.slice.call(arguments);
						return fn.apply(null, [async.forEach].concat(args));
					};
				};
			async.forEach = function (arr, iterator, callback) {
				if (!arr.length) {
					return callback();
				}
				var completed = 0;
				forEach(arr, function (x) {
					iterator(x, function (err) {
						if (err) {
							callback(err);
							callback = function () {};
						} else {
							completed++;
							if (completed === arr.length) {
								callback();
							}
						}
					});
				});
			};
			async.map = doParallel(asyncMap);
			async.parallel = function (tasks, callback) {
				callback = callback || function () {};
				if (tasks.constructor === Array) {
					async.map(tasks, function (fn, callback) {
						if (fn) {
							fn(function (err) {
								var args = Array.prototype.slice.call(arguments, 1);
								if (args.length <= 1) {
									args = args[0];
								}
								callback.call(null, err, args);
							});
						}
					}, callback);
				}
			};
			return async;
		}()),
		JUST = function (newOptions) {
			var
				options = {
					open : '<%',
					close : '%>',
					ext : '',
					useCache : false,
					watchForChanges : false,
					root : ''
				},
				trimExp = /^\s+|\s+$/g,
				escapeExp = /([.*+?\^=!:${}()|\[\]\/\\])/g,
				STATE_RAW = 0,
				STATE_PARTIAL = 1,
				STATE_EXTEND = 2,
				STATE_CONDITION = 3,
				STATE_ELSE = 4,
				STATE_SWITCH = 5,
				STATE_CASE = 6,
				STATE_DEFAULT = 7,
				STATE_LOOP = 8,
				cache = {},
				loaders = {},
				watchers = {},
				regExpEscape = function (str) {
					return String(str).replace(escapeExp, '\\$1');
				},
				parse = function (html) {
					var
						lineNo = 1,
						buffer = [ 'with (this.data) { with (this.customData) { this.buffer.push(\'' ],
						matches = html.split(new RegExp(regExpEscape(options.open) + '((?:.|[\r\n])+?)(?:' + regExpEscape(options.close) + '|$)')),
						length,	i, text, prefix, postfix, line, tmp, jsFromPos, state;

					for (i = 0, length = matches.length; i < length; i++) {
						text = matches[i];
						if (i % 2 === 1) {
							line = 'this.line=' + lineNo;
							jsFromPos = 1;
							state = STATE_RAW;
							switch (text.charAt(0)) {
							case '@':
								prefix = '\',(' + line + ', this.partial(';
								postfix = ')),\'';
								state = STATE_PARTIAL;
								break;
							case '!':
								prefix = '\',(' + line + ', this.extend(';
								postfix = ')),\'';
								state = STATE_EXTEND;
								break;
							case '*':
								prefix = '\',(' + line + ', this.child(\'';
								postfix = '\')),\'';
								break;
							case '[':
								prefix = '\');' + line + ';this.blockStart(\'';
								postfix = '\');this.buffer.push(\'';
								break;
							case ']':
								prefix = '\');' + line + ';this.blockEnd(';
								postfix = ');this.buffer.push(\'';
								break;
							case '=':
								prefix = '\',(' + line + ', ';
								postfix = '),\'';
								break;
							case '?':
								prefix = '\');' + line + ';';
								postfix = 'this.buffer.push(\'';
								state = STATE_CONDITION;
								break;
							case ':':
								prefix = '\');' + line + ';}else';
								postfix = 'this.buffer.push(\'';
								state = STATE_ELSE;
								break;
							case '|':
								prefix = '\');' + line + ';';
								postfix = 'this.buffer.push(\'';
								state = STATE_LOOP;
								break;
							default:
								prefix = '\');' + line + ';';
								postfix = ';this.buffer.push(\'';
								jsFromPos = 0;
							}
							switch (state) {
							case STATE_RAW:
								buffer.push(prefix, text.substr(jsFromPos).replace(trimExp, ''), postfix);
								break;
							case STATE_CONDITION:
								tmp = text.substr(jsFromPos).replace(trimExp, '');
								if (!tmp.length) {
									buffer.push(prefix, '}', postfix);
								} else {
									buffer.push(prefix, 'if(', tmp, '){', postfix);
								}
								tmp = undefined;
								break;
							case STATE_ELSE:
								tmp = text.substr(jsFromPos).replace(trimExp, '');
								if (!tmp.length) {
									buffer.push(prefix, '{', postfix);
								} else {
									buffer.push(prefix, ' if(', tmp, '){', postfix);
								}
								tmp = undefined;
								break;
							case STATE_PARTIAL:
							case STATE_EXTEND:
								tmp = text.substr(jsFromPos).replace(trimExp, '').split(/\s+/);
								tmp = ['\'' + tmp[0] + '\'', tmp.splice(1).join(' ')];
								if (!tmp[1].length) {
									tmp = tmp[0];
								} else {
									tmp = tmp.join(',');
								}
								buffer.push(prefix, tmp, postfix);
								tmp = undefined;
								break;
							case STATE_LOOP:
								tmp = text.substr(jsFromPos).replace(trimExp, '').split(/\s+/);
								if (!tmp[0].length) {
									buffer.push('\');' + line + ';}, this);this.buffer.push(\'');
								} else {
									buffer.push(prefix, tmp[0], '.forEach(function(', tmp[1], '){this.buffer.push(\'');
								}
								tmp = undefined;
								break;
							}
						} else {
							buffer.push(text.replace(/[\\']/g, '\\$&').replace(/\r/g, ' ').replace(/\n/g, '\\n'));
						}
						lineNo += text.split(/\n/).length - 1;
					}
					buffer.push('\'); } } return this.buffer;');
					buffer = buffer.join('');
					return new Function(buffer);
				},
				loaded = function (error, file, blank) {
					var callbacks = loaders[file];
					delete (loaders[file]);
					async.forEach(callbacks, function (loader, callback) {
						loader(error, blank);
						callback();
					}, function () {});
				},
				read = function (file, callback) {
					if (Object.prototype.toString.call(options.root) === '[object Object]') {
						try {
							var data = eval('(options.root.' + file + ')');
							if (Object.prototype.toString.call(data) === '[object String]') {
								callback(undefined, data);
							} else {
								callback('Failed to load template');
							}
						} catch (e) {
							callback(e);
						}
					} else {
						fs.readFile(file, 'utf8', callback);
					}
				},
				load = function (file, callback) {
					if (options.useCache && cache[file]) {
						if (callback) { callback(undefined, cache[file]); }
					} else {
						if (!loaders[file]) {
							loaders[file] = [];
							if (callback) { loaders[file].push(callback); }
							read(file, function (error, data) {
								if (error) {
									loaded(error, file, undefined);
								} else {
									try {
										var blank = parse(data);
										if (options.useCache) {
											cache[file] = blank;
										}
										loaded(undefined, file, blank);
										if (options.watchForChanges) {
											watchers[file] = fs.watch(file, function () {
												watchers[file].close();
												delete (watchers[file]);
												delete (cache[file]);
											});
										}
									} catch (e) {
										e.message = e.message + ' in ' + file;
										loaded(e, file, undefined);
									}
								}
							});
						} else {
							if (callback) { loaders[file].push(callback); }
						}
					}
				},
				Template = function (file, data, customData) {
					this.file = file;
					if (Object.prototype.toString.call(options.root) === '[object String]') {
						this.file = path.normalize((options.root.length ? (options.root + '/') : '') + file + options.ext);
					}
					this.data = data;
					this.customData = customData || {};
					this.buffer = [];
					this.tmpBuffer = undefined;
					this.watcher = undefined;
					this.line = 1;
					this.partials = [];
					this.childData = [];
					this.childError = undefined;
					this.childCallback = undefined;
					this.callback = undefined;
					this.blocks = {};
				};
			Template.prototype.blockStart = function (name) {
				this.tmpBuffer = this.buffer;
				if (!this.blocks[name]) { this.blocks[name] = []; }
				if (!this.blocks[name].length) {
					this.buffer = this.blocks[name];
				} else {
					this.buffer = [];
				}
			};
			Template.prototype.blockEnd = function () {
				this.buffer = this.tmpBuffer;
				delete (this.tmpBuffer);
			};
			Template.prototype.partial = function (template, customData) {
				var
					part = [],
					page = new Template(template, this.data, customData);
				this.partials.push(function (callback) {
					page.render(function (error, html) {
						if (!error) { part.push(html); }
						callback(error);
					});
				});
				return part;
			};
			Template.prototype.extend = function (template, customData) {
				var
					page = new Template(template, this.data, customData),
					callback = this.callback;
				page.blocks = this.blocks;
				this.callback = function (error, data) {
					if (error) {
						page.childError = error;
						if (page.childCallback) { page.childCallback(error); }
					} else {
						page.childData.push(data);
						if (page.childCallback) { page.childCallback(); }
					}
				};
				page.partials.push(function (callback) {
					if (page.childError) {
						callback(page.childError);
					} else if (page.childData.length) {
						callback();
					} else {
						page.childCallback = callback;
					}
				});
				page.render(callback);
				return '';
			};
			Template.prototype.child = function (block) {
				if (block && block.length) {
					if (!this.blocks[block]) { this.blocks[block] = []; }
					return this.blocks[block];
				}
				return this.childData;
			};
			Template.prototype.render = function (callback) {
				var that = this;
				this.callback = callback;
				load(this.file, function (error, blank) {
					if (error) {
						if (that.callback) { that.callback(error, undefined); }
					} else {
						try {
							var buffer = blank.call(that);
							async.parallel(that.partials, function (error) {
								var html = '', length, i;
								if (!error) {
									for (i = 0, length = buffer.length; i < length; i++) {
										html += (Array.isArray(buffer[i])) ? buffer[i].join('') : buffer[i];
									}
								}
								if (that.callback) { that.callback(error, html); }
							});
						} catch (e) {
							e.message = e.message + ' in ' + that.file + ' on line ' + that.line;
							if (that.callback) { that.callback(e, undefined); }
						}
					}
				});
			};
			this.configure = function (newOptions) {
				var option;
				newOptions = newOptions || {};
				for (option in options) {
					options[option] = newOptions[option] || options[option];
				}
			};
			this.render = function (template, data, callback) {
				if ('function' == typeof data) {
					callback = data, data = {};
				}
				var tpl = new Template(template, data);
				tpl.render(callback);
			};
			this.configure(newOptions);
		};
	if (typeof module !== 'undefined' && module.exports) {
		fs = require('fs');
		path = require('path');
		module.exports = JUST;
	} else {
		if (!Array.prototype.filter) {
			Array.prototype.filter = function (fun, thisp) {
				var
					len = this.length,
					res = [],
					i,
					val;
				if (typeof fun !== 'function') { throw new TypeError(); }
				for (i = 0; i < len; i++) {
					if (i in this) {
						val = this[i];
						if (fun.call(thisp, val, i, this)) { res.push(val); }
					}
				}
				return res;
			};
		}
		if (!Array.prototype.forEach) {
			Array.prototype.forEach = function (fun, thisp) {
				var
					len = this.length,
					i;
				if (typeof fun !== 'function') { throw new TypeError(); }
				for (i = 0; i < len; i++) {
					if (i in this) {
						fun.call(thisp, this[i], i, this);
					}
				}
			};
		}
		if (!Array.isArray) {
			Array.isArray = function (obj) {
				return Object.prototype.toString.call(obj) === '[object Array]';
			};
		}

		var cbSplit;

		if (!cbSplit) {
			cbSplit = function (str, separator, limit) {
				if (Object.prototype.toString.call(separator) !== '[object RegExp]') {
					return cbSplit.nativeSplit.call(str, separator, limit);
				}
				var
					output = [],
					lastLastIndex = 0,
					flags = (separator.ignoreCase ? 'i' : '') +
					(separator.multiline  ? 'm' : '') +
					(separator.sticky     ? 'y' : ''),
					separator2, match, lastIndex, lastLength;

				separator = new RegExp(separator.source, flags + 'g');

				str = str + '';

				if (!cbSplit.compliantExecNpcg) {
					separator2 = new RegExp('^' + separator.source + '$(?!\\s)', flags);
				}

				if (limit === undefined || +limit < 0) {
					limit = Infinity;
				} else {
					limit = Math.floor(+limit);
					if (!limit) {
						return [];
					}
				}

				while (match = separator.exec(str)) {
					lastIndex = match.index + match[0].length;
					if (lastIndex > lastLastIndex) {
						output.push(str.slice(lastLastIndex, match.index));

						if (!cbSplit.compliantExecNpcg && match.length > 1) {
							match[0].replace(separator2, function () {
								var i;
								for (i = 1; i < arguments.length - 2; i++) {
									if (arguments[i] === undefined) {
										match[i] = undefined;
									}
								}
							});
						}

						if (match.length > 1 && match.index < str.length) {
							Array.prototype.push.apply(output, match.slice(1));
						}

						lastLength = match[0].length;
						lastLastIndex = lastIndex;

						if (output.length >= limit) {
							break;
						}
					}

					if (separator.lastIndex === match.index) {
						separator.lastIndex++;
					}
				}

				if (lastLastIndex === str.length) {
					if (lastLength || !separator.test('')) {
						output.push('');
					}
				} else {
					output.push(str.slice(lastLastIndex));
				}

				return output.length > limit ? output.slice(0, limit) : output;
			};

			cbSplit.compliantExecNpcg = /()??/.exec('')[1] === undefined;
			cbSplit.nativeSplit = String.prototype.split;
		}

		String.prototype.split = function (separator, limit) {
			return cbSplit(this, separator, limit);
		};

		window.JUST = JUST;
		path = (function () {
			var
				normalizeArray = function (parts, allowAboveRoot) {
					var up = 0, i, last;
					for (i = parts.length - 1; i >= 0; i--) {
						last = parts[i];
						if (last === '.') {
							parts.splice(i, 1);
						} else if (last === '..') {
							parts.splice(i, 1);
							up++;
						} else if (up) {
							parts.splice(i, 1);
							up--;
						}
					}
					if (allowAboveRoot) {
						while (up) {
							parts.unshift('..');
							up--;
						}
					}
					return parts;
				},
				normalize = function (path) {
					var
						isAbsolute = path.charAt(0) === '/',
						trailingSlash = path.slice(-1) === '/';
					path = normalizeArray(path.split('/').filter(function (p) {
						return !!p;
					}), !isAbsolute).join('/');
					if (!path && !isAbsolute) {
						path = '.';
					}
					if (path && trailingSlash) {
						path += '/';
					}
					return (isAbsolute ? '/' : '') + path;
				};
			return {
				normalize: normalize
			};
		}());
		var AjaxObject = function (url, callbackFunction) {
			var that = this;
			this.updating = false;
			this.abort = function () {
				if (that.updating) {
					that.updating = false;
					that.AJAX.abort();
					that.AJAX = null;
				}
			};
			this.update = function () {
				if (that.updating) { return false; }
				that.AJAX = null;
				if (window.XMLHttpRequest) {
					that.AJAX = new XMLHttpRequest();
					if (that.AJAX.overrideMimeType) { that.AJAX.overrideMimeType('text/html'); }
				} else {
					that.AJAX = new ActiveXObject('Microsoft.XMLHTTP');
				}
				if (that.AJAX === null) {
					return false;
				}
				that.AJAX.onreadystatechange = function () {
					if (that.AJAX.readyState === 4) {
						that.updating = false;
						that.callback(that.AJAX.responseText, that.AJAX.status, that.AJAX.responseXML);
						that.AJAX = null;
					}
				};
				that.updating = new Date();
				that.AJAX.open('GET', url, true);
				that.AJAX.send(null);
				return true;
			};
			this.callback = callbackFunction || function () { };
		};
		fs = (function () {
			var
				readFile = function (file, encoding, callback) {
					var request = new AjaxObject(file, function (data, status) {
						if (status < 200 || status > 399) {
							callback('Failed to load template');
						} else {
							callback(undefined, data);
						}
					});
					try {
						request.update();
					} catch (e) {
						callback(e);
					}
				},
				watch = function () {};
			return {
				readFile: readFile,
				watch: watch
			};
		}());
	}
}());
