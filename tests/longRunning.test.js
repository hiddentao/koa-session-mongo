/*
Long-running tests not suitable for Continuous Integration.
 */

var _ = require('lodash');

require("mocha-as-promised")();

var chai = require('chai');
chai.use(require("chai-as-promised"));

var expect = chai.expect,
  assert = chai.assert,
  should = chai.should();

var Promise = require('bluebird');

var mongoSession = require('../');
var createSession = Promise.coroutine(mongoSession.create),
  closeConnections = Promise.coroutine(mongoSession.closeConnections);

var mongo = require('mongodb');
var mongoose = require('mongoose');


describe('Mongo session layer long-running tests', function() {
  var testDb, testCollection;

  before(function(done) {
    console.log('Assuming that Mongod is running on 127.0.0.1 at port 27017');
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

  describe('when an entry gets too old', function() {
    var store, sid;

    beforeEach(function(done) {
      sid = mongoose.Types.ObjectId();

      createSession({
        db: 'koa-session-mongo-test',
        expirationTime: 0
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

    it('gets automatically deleted', function() {
      var NEED_TO_WAIT = 65;

      this.timeout((NEED_TO_WAIT + 1)* 1000);  // it can take upto 60 seconds to

      /* Auto-delete (mongoDB TTL) only works on 2.2+, so let's check the version before testing */
      var adminDb = testDb.admin();
      return Promise.promisify(adminDb.buildInfo, adminDb)()
        .then(function(buildInfo) {
          var versionTokens = buildInfo.version.split('.');
          if (2 > parseInt(versionTokens[0]) || 2 > parseInt(versionTokens[1])) {
            console.warn('Need MongoDB version 2.2 or above to test TTL. Skipping test.');
            return;
          } else {

            return store.save(sid, 'blah')
              .then(function() {
                var resolver = Promise.defer();

                console.log('Need to wait for upto 60 seconds... (see http://docs.mongodb.org/manual/tutorial/expire-data/)');
                setTimeout(function() {
                  resolver.resolve();
                }, NEED_TO_WAIT * 1000);

                return resolver.promise;
              })
              .then(function() {
                return store.load(sid);
              })
              .then(function(data) {
                expect(data).to.be.null;
              });

          }
        });
    });

  });

});

