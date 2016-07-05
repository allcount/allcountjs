var jade = require('../');
var assert = require('assert');
var barrage = require('barrage');
var PassThrough = require('stream').PassThrough;

describe('then-jade', function(){

  describe('.render()', function(){

    it('should callback when called with a callback', function(done){
      jade.render('div', {}, function(err, res) {
        if (err) throw err;
        assert.equal(res, '<div></div>');
        done();
      });
    });

    it('should return a promise when called without a callback', function(done) {
      var p = jade.render('div', {});
      p.then(function(res) {
        assert.equal(res, '<div></div>');
        done();
      }, function(err) {
        throw err;
      });
    });

  });

  describe('.renderFile() with cache', function() {
    it('should add a cache entry after compilation', function(done) {
      var path = 'test/gn-cases/gn-basic.jade';
      jade.renderFile(path, { cache: true, message: 'Jade' }, function(err, res) {
        if (err) throw err;
        assert.ok(jade.cache['key:'+path]);
        done();
      });
    });
    it('should use cache entry instead of compilation', function(done) {
      var path = 'fakefile';
      jade.cache['key:'+path] = function(options) {
        var s = barrage(new PassThrough);
        s.end('from cache');
        return s;
      }
      jade.renderFile(path, { cache: true, message: 'Jade' }, function(err, res) {
        if (err) throw err;
        assert.equal(res, 'from cache');
        done();
      });
    });
  });

});

