'use strict';

/*jshint node:true */
/*global describe, it, afterEach, beforeEach*/

require('should');
var zschemaErrors = require('../lib/index.js');

describe('z-schema-errors', function(){
  describe('defaults', function(){
    var reporter = zschemaErrors.init();
    it('should return default message for ENUM_MISMATCH code', function(){
      var error = {
        code: 'ENUM_MISMATCH',
        params: [ 'invalid_value' ],
        path: '#/elements',
        description: 'The elements'
      };

      var message = reporter.extractMessage({ errors: [error] });
      message.should.equal("An error occurred 'Invalid property \"invalid_value\"' on property elements (The elements).");
    });

    it('should return default message for any other code', function(){
      var error = {
        code: 'INVALID_FORMAT',
        path: '#/letterA',
        description: 'The letter A',
        message: 'Object didn\'t pass validation for format ^a$: b'
      };

      var message = reporter.extractMessage({ errors: [error] });
      message.should.equal("An error occurred 'Object didn\'t pass validation for format ^a$: b' on property letterA (The letter A).");
    });

    it('should correctly report nested objects', function(){
      var error = {
        code: 'INVALID_FORMAT',
        path: '#/parent/child/letterA',
        description: 'The letter A',
        message: 'Object didn\'t pass validation for format ^a$: b'
      };

      var message = reporter.extractMessage({ errors: [error] });
      message.should.equal("An error occurred 'Object didn\'t pass validation for format ^a$: b' on property parent.child.letterA (The letter A).");
    });

    it('should correctly report array elements', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/[0]',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ errors: [error] });
      message.should.equal("An error occurred 'Expected type number but found type string' on property items[0] (The item).");
    });
  });

  describe('customize extractors', function(){
    var reporter = zschemaErrors.init({
      extractors: {
        description: function(d){ return 'Description: ' + d; }
      }
    });

    it('should report description from custom extractor', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/[0]',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ errors: [error] });
      message.should.equal("An error occurred 'Expected type number but found type string' on property items[0] Description: The item.");
    });
  });

  describe('customize formats', function(){
    var reporter = zschemaErrors.init({
      formats: {
        'INVALID_TYPE': '{path} has an invalid type. Error: {message}'
      }
    });

    it('should report using custom format', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/[0]',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ errors: [error] });
      message.should.equal("items[0] has an invalid type. Error: Expected type number but found type string");
    });
  });

  describe('customize formats and extractors', function(){
    var reporter = zschemaErrors.init({
      formats: {
        'INVALID_TYPE': '{description} @ {path} has an invalid type. Error: {message}'
      },
      extractors: {
        description: function(d){ return d; }
      }
    });

    it('should report using custom format and extractor', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/[0]',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ errors: [error] });
      message.should.equal("The item @ items[0] has an invalid type. Error: Expected type number but found type string");
    });
  });

  describe('customize context message', function(){
    var reporter = zschemaErrors.init({
      contextMessage: 'Error!!!'
    });

    it('should report using custom format and extractor', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/[0]',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ errors: [error] });
      message.should.equal("Error!!! 'Expected type number but found type string' on property items[0] (The item).");
    });
  });

  describe('multiple errors', function(){
    var reporter = zschemaErrors.init();

    it('should report errors separated by (also)', function(){
      var error1 = {
        code: 'INVALID_TYPE',
        path: '#/items/[0]',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var error2 = {
        code: 'INVALID_FORMAT',
        path: '#/letterA',
        description: 'The letter A',
        message: 'Object didn\'t pass validation for format ^a$: b'
      };

      var message = reporter.extractMessage({ errors: [error1, error2] });
      message.should.equal("An error occurred 'Expected type number but found type string' on property items[0] (The item). (also) An error occurred 'Object didn't pass validation for format ^a$: b' on property letterA (The letter A).");
    });
  });
});