/*
MongoDB storage layer for koa-session-store.

Based on https://github.com/kcbanner/connect-mongo
 */

var mongo = require('mongodb');
var Promise = require('bluebird');
var url = require('url');


/**
 * Default options
 */

var defaultOptions = {
  host: '127.0.0.1',
  port: 27017,
  collection: 'sessions',
  auto_reconnect: false,
  ssl: false,
  defaultExpirationTimeMs: 1000 * 60 * 60 * 24 * 14,    // 2 weeks
  w: 1
};





/**
 * @param collection {Object} collection object.
 * @constructor
 */
var MongoStore = function(collection) {
  this._collection = collection;
  this._findOne = Promise.promisify(this._collection.findOne, this._collection);
  this._update = Promise.promisify(this._collection.update, this._collection);
  this._remove = Promise.promisify(this._collection.remove, this._collection);
};


/**
 * Load data for given id.
 * @param sid {String} session id.
 * @return {String} data.
 */
MongoStore.prototype.load = function*(sid) {
  var data = yield this._findOne({_id: sid});
  if (data && data._id) {
    return data.blob;
  } else {
    return null;
  }
};


/**
 * Save data for given id.
 * @param sid {String} session id.
 * @param blob {String} data to save.
 */
MongoStore.prototype.save = function*(sid, blob) {
  var data = {
    _id: sid,
    blob: blob,
    updatedAt: new Date()
  };

  yield this._update({_id: sid}, data, { upsert: true, safe: true });
};



/**
 * Remove data for given id.
 * @param sid {String} session id.
 */
MongoStore.prototype.remove = function*(sid) {
  yield this._remove({_id: sid});
};





/**
 * Connect to the db and load the collection.
 *
 * @param db {Object} MongoDB db object.
 * @param options {Object} connection options.
 *
 * @return {Promise} resolves to the collection
 *
 * @private
 */
var _connect = Promise.coroutine(function*(dbConn, options) {
  var openedDb = null,
    collection = null;

  try {
    openedDb = yield Promise.promisify(dbConn.open, dbConn)();
  } catch (err) {
    if (!(err instanceof Error)) {
      err = new Error(String(err));
    }
    err.message = 'Error opening db: ' + err.message;
    throw err;
  }

  if (options.username && options.password) {
    try {
      yield Promise.promisify(openedDb.authenticate, openedDb)(options.username, options.password);
    } catch (err) {
      throw new Error('Error authenticating with ' + options.username + ': ' + err.message);
    }
  }

  var collectionName = defaultOptions.collection || options.collection;
  try {
    collection = yield Promise.promisify(openedDb.collection, openedDb)(collectionName);
  } catch (err) {
    throw new Error('Error opening collection ' + collectionName + ': ' + err.message);
  }

  try {
    var expirationTime = options.expirationTime || options.defaultExpirationTime;
    yield Promise.promisify(collection.ensureIndex, collection)({updatedAt: 1}, {expireAfterSeconds: expirationTime});
  } catch (err) {
    throw new Error('Error creating index on ' + collectionName + ': ' + err.message);
  }

  return collection;
});




/**
 * Create a MongoDB store using given options.
 *
 * @param options {Object} options.
 * @param options.db {String|Object} db name or instantiated node-mongo-native db object.
 * @param options.collection {String} collection name. Default is 'sessions'
 * @param options.host {String} server hostname. Default is 127.0.0.1
 * @param options.port {Number} server port. Default is 27017.
 * @param options.username {String} username. Default is null.
 * @param options.password {String} password. Default is null.
 * @param options.auto_reconnect {Boolean} gets passed to the node-mongo-native constructor as the same option. Default is false.
 * @param options.ssl {Boolean} use ssl to connect to the server. Default is false.
 * @param options.defaultExpirationTimeMs {Number} time-to-live (TTL) in milliseconds for any given session data - mongod will auto-delete data
 * which hasn't been updated for this amount of time. Default is 2 weeks.
 *
 * @param options.url {String} connection URL of the form: mongodb://user:pass@host:port/database/collection. If provided then
 * this will take precedence over other options except `mongoose`.
 *
 * @param options.mongoose {Object} a mongoose connection, use mongooseDb.connections[0] to get the connection out of an
 * existing Mongoose object.  If provided then this will take precedence over other options.
 */
exports.create = function*(options) {
  options = options || {};
  var dbConn = null;

  // mongoose connection?
  if (options.mongoose_connection) {
    if (options.mongoose_connection.user && options.mongoose_connection.pass) {
      options.username = options.mongoose_connection.user;
      options.password = options.mongoose_connection.pass;
    }

    dbConn = new mongo.Db(options.mongoose_connection.db.databaseName,
      new mongo.Server(options.mongoose_connection.db.serverConfig.host,
        options.mongoose_connection.db.serverConfig.port,
        options.mongoose_connection.db.serverConfig.options
      ), { w: defaultOptions.w }
    );

  }
  // non-mongoose
  else {
    // url?
    if(options.url) {
      var db_url = url.parse(options.url);

      if (db_url.port) {
        options.port = parseInt(db_url.port);
      }

      if (undefined !== db_url.pathname) {
        var pathname = db_url.pathname.split('/');

        if (pathname.length >= 2 && pathname[1]) {
          options.db = pathname[1];
        }

        if (pathname.length >= 3 && pathname[2]) {
          options.collection = pathname[2];
        }
      }

      if (undefined !== db_url.hostname) {
        options.host = db_url.hostname;
      }

      if (undefined !== db_url.auth) {
        var auth = db_url.auth.split(':');

        if (auth.length >= 1) {
          options.username = auth[0];
        }

        if (auth.length >= 2) {
          options.password = auth[1];
        }
      }
    }

    if(!options.db) {
      throw new Error('Missing option: db');
    }

    // options.db already initialised?
    if ('object' === typeof options.db && 'function' === typeof options.db.open) {
      dbConn = options.db; // Assume it's an instantiated node-mongo-native Object
    } else {
      options.auto_reconnect = options.auto_reconnect || defaultOptions.auto_reconnect;
      options.ssl = options.ssl || defaultOptions.ssl;

      dbConn = new mongo.Db(options.db,
        new mongo.Server(
          options.host || defaultOptions.host,
          options.port || defaultOptions.port,
          options),
        { w: defaultOptions.w }
      );
    } // if options.db not an object
  }

  return new MongoStore(yield _connect(dbConn, options));
};



