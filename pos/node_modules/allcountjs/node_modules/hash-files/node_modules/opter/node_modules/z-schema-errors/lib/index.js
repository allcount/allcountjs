'use strict';

/*jshint node:true */

var xtend = require('xtend');

function createMessageReporter(options){
  var DEFAULT_EXTRACTORS = {
    path: function (path){
      if (path){
        return path.substr(2).replace(/\//g, '.').replace(/\.\[/g, '[');
      }

      return '';
    },
    message: function(m){ return m; },
    description: function(d){ return '(' + d + ')'; },
    params: function extractParams(p) {
      if (Array.isArray(p)) {
        return extractParams(p[0]);
      }

      return p;
    }
  };

  var DEFAULT_FORMATS = {
    DEFAULT: '{context} \'{message}\' on property {path} {description}.',
    ENUM_MISMATCH: '{context} \'Invalid property "{params}"\' on property {path} {description}.'
  };

  function formatMessage(format, error){
    return ['path', 'description', 'message', 'params'].reduce(function(current, part){
      return current.replace('{' + part + '}', error[part] ? extractors[part](error[part]) : '');
    }, format).replace('{context}', contextMessage || '');
  }

  function extractMessage(report) {
    return report.errors.map(function(error){
      return formatMessage(formats[error.code] || formats.DEFAULT, error);
    }).join(' (also) ');
  }

  options = options || {};

  var formats = xtend(DEFAULT_FORMATS, options.formats || {});
  var extractors = xtend(DEFAULT_EXTRACTORS, options.extractors || {});
  var contextMessage = options.contextMessage || 'An error occurred';

  return {
    extractMessage: extractMessage
  };
}

module.exports.init = createMessageReporter;