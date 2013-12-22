# koa-session-mongo

[![Build Status](https://secure.travis-ci.org/hiddentao/koa-session-mongo.png)](http://travis-ci.org/hiddentao/koa-session-mongo) [![NPM module](https://badge.fury.io/js/koa-session-mongo.png)](https://npmjs.org/package/koa-session-mongo)

MongoDB storage layer for [Koa session middleware](https://github.com/hiddentao/koa-session-store). Based on [connect-mongo](https://github.com/kcbanner/connect-mongo).

## Installation

```bash
npm install koa-session-mongo
```

## Usage

```js
var session = require('koa-session-store');
var mongoStore = require('koa-session-mongo');
var koa = require('koa');

var app = koa();

app.keys = ['some secret key'];  // needed for cookie-signing

app.use(session({
  store: mongoStore.create({
    db: 'database_name'
  })
}));

app.use(function(next){
  return function *(){
    var n = this.session.views || 0;
    this.session.views = ++n;
    this.body = n + ' views';
  }
})

app.listen(3000);
console.log('listening on port 3000');
```

If you wish to specify host, port, etc:

```js
var store = mongoStore.create({
  host: 'mongo.hostname.com',
  port: 48473,
  db: 'database_name',
  username: 'admin',
  password: 'password',
})
```

Or you can pass in connection parameters as a URL string:

```js
var store = mongoStore.create({
  url: 'mongodb://user:pass@host:port/database_name/collection_name'
})
```

Or you can use an existing [node-mongo-native](https://github.com/mongodb/node-mongodb-native) db object:

```js
var mongo = require('mongodb');

var db = new mongo.Db("database_name", new mongo.Server('host', port, {}), { w: 1 });

var store = mongoStore.create({
  db: dbConn,
  collection: 'sessions',
  username: 'admin',
  password: 'password'
})
```

Or you can use an existing [Mongoose](https://github.com/LearnBoost/mongoose) connection:

```js
var mongoose = require('mongoose');

mongoose.connect(...);

var store = mongoStore.create({
  mongoose: mongoose.connection
})
```


## Options

The following configuration options are available for the `create()` call:

  * **db** `String` or `Object` - db name or instantiated [node-mongo-native](https://github.com/mongodb/node-mongodb-native) db object.
  * **collection** `String` - collection name. Default is _sessions_.
  * **host** `String` server hostname. Default is _127.0.0.1_.
  * **port** `Number` - server port. Default is _27017_.
  * **username** `String` - username. Default is _null_.
  * **password** `String` - password. Default is _null_.
  * **auto_reconnect** `Boolean` - gets passed to the [node-mongo-native](https://github.com/mongodb/node-mongodb-native) constructor as the same option. Default is _false_.
  * **ssl** `Boolean` - use ssl to connect to the server. Default is _false_.
  * **defaultExpirationTimeMs** `Number` - time-to-live (TTL) in milliseconds for any given session data - MongoDB will auto-delete data which hasn't been updated for this amount of time. Default is 2 weeks.
  * **url** `String` - connection URL of the form** `mongodb://user:pass@host:port/database/collection`. If provided then this will take precedence over other options except** `mongoose`.
  * **mongoose** `Object` - a [Mongoose](https://github.com/LearnBoost/mongoose) connection, use** `mongoose.connection` to get the connection out of an existing Mongoose object.  If provided then this will take precedence over other options.

## License

Copyright (c) 2013 [Ramesh Nair](http://hiddentao.com/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
