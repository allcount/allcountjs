var assert = require('assert')
var LongModule = require('../')
var mongoose = require('mongoose')
var Schema = mongoose.Schema;
var Long;

describe('Long', function(){
  before(function(){
    Long = LongModule(mongoose);
  })

  it('is a function', function(){
    assert.equal('function', typeof Long);
  })

  it('extends mongoose.Schema.Types', function(){
    assert.ok(Schema.Types.Long);
    assert.equal(Long, Schema.Types.Long);
  })

  it('extends mongoose.Types', function(){
    assert.ok(mongoose.Types.Long);
    assert.equal(mongoose.mongo.Long, mongoose.Types.Long);
  })

  it('can be used in schemas', function(){
    var s = new Schema({ long: Long });
    var long = s.path('long')
    assert.ok(long instanceof mongoose.SchemaType);
    assert.equal('function', typeof long.get);

    var s = new Schema({ long: 'long' });
    var long = s.path('long')
    assert.ok(long instanceof mongoose.SchemaType);
    assert.equal('function', typeof long.get);
  })

  describe('integration', function(){
    var db, S, schema, id;

    before(function(done){
      db = mongoose.createConnection('localhost', 'mongoose_long')
      db.once('open', function () {
        schema = new Schema({ long: Long, name: 'string' });
        S = db.model('Long', schema);
        done();
      });
    })

    describe('casts', function(){
      it('numbers', function(){
        var v = 200000000;
        var s = new S({ long: v });
        assert.ok(s.long instanceof mongoose.Types.Long);
        assert.equal(v, s.long.toNumber());

        v = new Number(200000000);
        s = new S({ long: v });
        assert.ok(s.long instanceof mongoose.Types.Long);
        assert.equal(+v, s.long.toNumber());
      })

      it('strings', function(){
        var v = '200000000';
        var s = new S({ long: v});
        assert.ok(s.long instanceof mongoose.Types.Long);
        assert.equal(v, s.long.toString());
      })

      it('null', function(){
        var s = new S({ long: null });
        assert.equal(null, s.long);
      })

      it('mongo.Long', function(){
        var s = new S({ long: new mongoose.Types.Long("90") });
        assert.ok(s.long instanceof mongoose.Types.Long);
        assert.equal(90, s.long.toNumber());
      })

      it('non-castables produce _saveErrors', function(done){
        var schema = new Schema({ long: Long }, { strict: 'throw' });
        var M = db.model('throws', schema);
        var m = new M({ long: [] });
        m.save(function (err) {
          assert.ok(err);
          assert.equal('Long', err.type);
          assert.equal('CastError', err.name);
          done();
        });
      })
    })

    it('can be saved', function(done){
      var s = new S({ long: 20 });
      id = s.id;
      s.save(function (err) {
        assert.ifError(err);
        done();
      })
    })

    it('is queryable', function(done){
      S.findById(id, function (err, doc) {
        assert.ifError(err);
        assert.ok(doc.long instanceof mongoose.Types.Long);
        assert.equal(20, doc.long.toNumber());
        done();
      });
    })

    it('can be updated', function(done){
      S.findById(id, function (err, doc) {
        assert.ifError(err);
        doc.long = doc.long.add(mongoose.Types.Long.fromString("10"));
        doc.save(function (err) {
          assert.ifError(err);
          S.findById(id, function (err, doc) {
            assert.ifError(err);
            assert.equal(30, doc.long.toNumber());
            done();
          });
        })
      })
    })

    it('can be required', function(done){
      var s = new Schema({ long: { type: Long, required: true }});
      var M = db.model('required', s);
      var m = new M;
      m.save(function (err) {
        assert.ok(err);
        m.long = 10;
        m.validate(function (err) {
          assert.ifError(err);
          done();
        })
      })
    })

    it('works with update', function(done){
      S.create({ long: 99999 }, function (err, s) {
        assert.ifError(err);
        S.update({ long: s.long, _id: s._id }, { name: 'changed' }, { upsert: true }, function (err) {
          assert.ifError(err);

          S.findById(s._id, function (err, doc) {
            assert.ifError(err);
            assert.equal(99999, doc.long);
            assert.equal('changed', doc.name);
            done();
          })
        });
      });

    })
  })
})
