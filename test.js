var _ = require('lodash');

require("mocha-as-promised")();

var chai = require('chai');
chai.use(require("chai-as-promised"));

var expect = chai.expect,
  assert = chai.assert,
  should = chai.should();

var Promise = require('bluebird');

var mongoSession = require('./');
var createSession = Promise.coroutine(mongoSession.create);

var mongo = require('mongodb');
var mongoose = require('mongoose');


describe('Mongo session layer tests', function() {

  console.log('Assuming that Mongod is running on 127.0.0.1 at port 27017');

//  var options = {
//    host: '127.0.0.1',
//    port: 27017,
//    db: 'koa-session-mongo-test'
//  };
//
//  var options_with_url = {
//    url: 'mongodb://127.0.0.1:27017/koa-session-mongo-test'
//  };
//
//  var testMongooseDb = mongoose.connect('mongodb://127.0.0.1:27017/koa-session-mongo-test');
//  var options_with_mongoose_connection = {
//    mongoose_connection: testMongooseDb.connection
//  };


  describe('when no options given', function() {
    it('throws', function() {
      return createSession().should.be.rejectedWith('Missing option: db');
    });
  });

  describe('when native db object given', function() {
    var testMongoNativeDb, options;

    beforeEach(function() {
      testMongoNativeDb = new mongo.Db("koa-session-mongo-test", new mongo.Server('127.0.0.1', 27017, {}), { w: 1 });
      options = {
        db: testMongoNativeDb
      };
    });

    afterEach(function(done) {
      testMongoNativeDb.close(true, done);
    });

    describe('normally', function() {

      it('connects successfully', function() {
        return createSession(options).should.be.fulfilled;
      });

      it('returns the store', function(done) {
        createSession(options)
          .then(function(store) {
            store.save.should.be.a('function');
            store.load.should.be.a('function');
            store.remove.should.be.a('function');
            done();
          })
          .catch(done)
        ;
      });

    });

    describe('when incorrect auth given', function() {
      it('fails to connect', function() {
        return createSession(_.extend({}, options, {
          username: 'admin',
          password: 'password'
        })).should.be.rejectedWith('Error authenticating with admin: auth fails');
      });
    });

  });

});

