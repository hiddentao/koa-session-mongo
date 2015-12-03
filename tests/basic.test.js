var _ = require('lodash');

require("mocha-as-promised")();

var chai = require('chai');
chai.use(require("chai-as-promised"));

var expect = chai.expect,
  assert = chai.assert,
  should = chai.should();

var Promise = require('bluebird');

var mongoSession = require('../');
var createSession = Promise.method(mongoSession.create),
  closeConnections = Promise.coroutine(mongoSession.closeConnections);

var mongo = require('mongodb');
var mongoose = require('mongoose');


describe('Mongo session layer tests', function() {
  var testDb, testCollection;

  before(function(done) {
    var dbConn = new mongo.Db("koa-session-mongo-test", new mongo.Server('127.0.0.1', 27017, {}), { w: 1 });

    Promise.promisify(dbConn.open, dbConn)()
      .then(function(openedDb) {
        testDb = openedDb;
        return Promise.promisify(testDb.collection, testDb)('sessions');
      })
      .then(function(collection) {
        testCollection = {
          findOne : Promise.promisify(collection.findOne, collection),
          update : Promise.promisify(collection.update, collection),
          remove: Promise.promisify(collection.remove, collection)
        };
      })
      .nodeify(done)
    ;
  });

  after(function(done) {
    testDb.close(true, done);
  });


  afterEach(function(done) {
    closeConnections().nodeify(done);
  });


  describe('when no options given', function() {
    it('throws', function() {
      return createSession().should.be.rejectedWith('Missing option: db');
    });
  });

  describe('when native db object given', function() {
    var testMongoNativeDb, dbIsOpen, options;

    beforeEach(function() {
      testMongoNativeDb = new mongo.Db("koa-session-mongo-test", new mongo.Server('127.0.0.1', 27017, {}), { w: 1 });

      dbIsOpen = false;
      testMongoNativeDb.on("open", function() {
        dbIsOpen = true;
      });

      options = {
        db: testMongoNativeDb
      };
    });

    afterEach(function(done) {
      if (dbIsOpen) {
        testMongoNativeDb.close(true, done);
      } else {
        done();
      }
    });

    it('returns the store', function(done) {
      createSession(options)
        .then(function(store) {
          store.save.should.be.a('function');
          store.load.should.be.a('function');
          store.remove.should.be.a('function');
        })
        .nodeify(done);
      ;
    });

    describe('when incorrect auth given', function() {
      it('fails to connect', function() {
        return createSession(_.extend({}, options, {
          username: 'admin',
          password: 'password'
        }))
          .then(function(store){
            return Promise.coroutine(store.load).bind(store)('abc');
          })
          .should.be.rejected;
      });
    });

    describe('once the store is ready', function() {
      var store, sid;

      beforeEach(function(done) {
        sid = mongoose.Types.ObjectId();

        createSession(options)
          .then(function(_store) {
            store = {
              save: Promise.coroutine(_store.save).bind(_store),
              load: Promise.coroutine(_store.load).bind(_store),
              remove: Promise.coroutine(_store.remove).bind(_store)
            };
          })
          .then(function() {
            return testCollection.remove();
          })
          .nodeify(done)
        ;
      });

      it('can save new items', function() {
        return store.save(sid, 'data1')
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(foundItem) {
            foundItem.blob.should.eql('data1');
          });
      });

      it('can overwrite items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.save(sid, 'data1')
          })
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(foundItem) {
            foundItem.blob.should.eql('data1');
          });
      });

      it('can load items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.load(sid);
          })
          .then(function(data) {
            data.should.eql('hell');
          });
      });

      it('can remove items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.remove(sid);
          })
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(data) {
            expect(data).to.eql(null);
          });
      });

    });

  });

  describe('when url given', function() {
    var options;

    beforeEach(function() {
      options = {
        url: 'mongodb://127.0.0.1:27017/koa-session-mongo-test/sessions'
      };
    });

    it('returns the store', function(done) {
      createSession(options)
        .then(function(store) {
          store.save.should.be.a('function');
          store.load.should.be.a('function');
          store.remove.should.be.a('function');
        })
        .nodeify(done)
      ;
    });

    describe('when incorrect auth given', function() {
      it('fails to connect', function() {
        return createSession({
          url: 'mongodb://admin:password@127.0.0.1:27017/koa-session-mongo-test/sessions'
        })
          .then(function(store){
            return Promise.coroutine(store.load).bind(store)('abc');
          })
          .should.be.rejected;
      });
    });

    describe('once the store is ready', function() {
      var store, sid;

      beforeEach(function(done) {
        sid = mongoose.Types.ObjectId();

        createSession(options)
          .then(function(_store) {
            store = {
              save: Promise.coroutine(_store.save).bind(_store),
              load: Promise.coroutine(_store.load).bind(_store),
              remove: Promise.coroutine(_store.remove).bind(_store)
            };
          })
          .then(function() {
            return testCollection.remove();
          })
          .nodeify(done)
        ;
      });

      it('can save new items', function() {
        return store.save(sid, 'data1')
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(foundItem) {
            foundItem.blob.should.eql('data1');
          });
      });

      it('can overwrite items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.save(sid, 'data1')
          })
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(foundItem) {
            foundItem.blob.should.eql('data1');
          });
      });

      it('can load items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.load(sid);
          })
          .then(function(data) {
            data.should.eql('hell');
          });
      });

      it('can remove items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.remove(sid);
          })
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(data) {
            expect(data).to.eql(null);
          });
      });

    });

  });

  describe('when Mongoose connection given', function() {
    var options;

    beforeEach(function() {
      var mongooseDb = mongoose.connect('mongodb://127.0.0.1:27017/koa-session-mongo-test');
      options = {
        mongoose: mongooseDb.connection
      };
    });

    afterEach(function(done) {
      Promise.promisify(mongoose.disconnect, mongoose)().nodeify(done);
    });

    it('returns the store', function(done) {
      createSession(options)
        .then(function(store) {
          store.save.should.be.a('function');
          store.load.should.be.a('function');
          store.remove.should.be.a('function');
        })
        .nodeify(done)
      ;
    });

    describe('once the store is ready', function() {
      var store, sid;

      beforeEach(function(done) {
        sid = mongoose.Types.ObjectId();

        createSession(options)
          .then(function(_store) {
            store = {
              save: Promise.coroutine(_store.save).bind(_store),
              load: Promise.coroutine(_store.load).bind(_store),
              remove: Promise.coroutine(_store.remove).bind(_store)
            };
          })
          .then(function() {
            return testCollection.remove();
          })
          .nodeify(done)
        ;
      });

      it('can save new items', function() {
        return store.save(sid, 'data1')
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(foundItem) {
            foundItem.blob.should.eql('data1');
          });
      });

      it('can overwrite items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.save(sid, 'data1')
          })
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(foundItem) {
            foundItem.blob.should.eql('data1');
          });
      });

      it('can load items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.load(sid);
          })
          .then(function(data) {
            data.should.eql('hell');
          });
      });

      it('can remove items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.remove(sid);
          })
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(data) {
            expect(data).to.eql(null);
          });
      });

    });

  });

  describe('when normal options given', function() {
    var options;

    beforeEach(function() {
      options = {
        host: '127.0.0.1',
        port: 27017,
        db: 'koa-session-mongo-test'
      };
    });

    it('returns the store', function(done) {
      createSession(options)
        .then(function(store) {
          store.save.should.be.a('function');
          store.load.should.be.a('function');
          store.remove.should.be.a('function');
        })
        .nodeify(done)
      ;
    });

    describe('when incorrect auth given', function() {
      it('fails to connect', function() {
        return createSession(_.extend(options, {
          username: 'admin',
          password: 'password'
        }))
          .then(function(store){
            return Promise.coroutine(store.load).bind(store)('abc');
          })
          .should.be.rejected;
      });
    });

    describe('once the store is ready', function() {
      var store, sid;

      beforeEach(function(done) {
        sid = mongoose.Types.ObjectId();

        createSession(options)
          .then(function(_store) {
            store = {
              save: Promise.coroutine(_store.save).bind(_store),
              load: Promise.coroutine(_store.load).bind(_store),
              remove: Promise.coroutine(_store.remove).bind(_store)
            };
          })
          .then(function() {
            return testCollection.remove();
          })
          .nodeify(done)
        ;
      });

      it('can save new items', function() {
        return store.save(sid, 'data1')
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(foundItem) {
            foundItem.blob.should.eql('data1');
          });
      });

      it('can overwrite items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.save(sid, 'data1')
          })
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(foundItem) {
            foundItem.blob.should.eql('data1');
          });
      });

      it('can load items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.load(sid);
          })
          .then(function(data) {
            data.should.eql('hell');
          });
      });

      it('can remove items', function() {
        return testCollection.update({ _id: sid }, {$set: {blob: 'hell'}}, {upsert:true, safe:true})
          .then(function() {
            return store.remove(sid);
          })
          .then(function() {
            return testCollection.findOne({_id: sid});
          })
          .then(function(data) {
            expect(data).to.eql(null);
          });
      });

    });

  });

  describe('when an entry gets overwritten', function() {
    var store, sid;

    beforeEach(function(done) {
      sid = mongoose.Types.ObjectId();

      createSession({
        db: 'koa-session-mongo-test'
      })
        .then(function(_store) {
            store = {
              save: Promise.coroutine(_store.save).bind(_store),
              load: Promise.coroutine(_store.load).bind(_store),
              remove: Promise.coroutine(_store.remove).bind(_store)
            };
        })
        .then(function() {
          return testCollection.remove();
        })
        .nodeify(done)
      ;
    });

    it('has its timestamp updated', function() {
      var oldTs = null;

      return store.save(sid, 'blah')
        .then(function() {
          return testCollection.findOne({_id: sid});
        })
        .then(function(foundItem) {
          oldTs = foundItem.updatedAt;
        })
        .then(function() {
          var resolver = Promise.defer();

          setTimeout(function() {
            store.save(sid, 'blah2')
              .then(function() {
                resolver.resolve();
              })
              .catch(function(err) {
                resolver.reject(err);
              })
            ;
          }, 50);

          return resolver.promise;
        })
        .then(function() {
          return testCollection.findOne({_id: sid});
        })
        .then(function(foundItem) {
          timeSince = foundItem.updatedAt.getTime() - oldTs.getTime();
          expect(0 < timeSince).to.be.true;
        });
    });

  });

});

