'use strict';

var events = require('events'),
  util = require('util'),
  common = require('./common'),
  logentries = require('../logentries'),
  stringifySafe = require('json-stringify-safe');

function stringify(msg) {
  var payload;

  try {
    payload = JSON.stringify(msg)
  }
  catch (ex) {
    payload = stringifySafe(msg, null, null, noop)
  }

  return payload;
}

exports.createClient = function (options) {
  return new Logentries(options);
};

var Logentries = exports.Logentries = function (options) {

  if (!options || !options.url) {
    throw new Error('options.url is required.');
  }

  events.EventEmitter.call(this);

  this.url = options.url;
  this.json = options.json || null;
  this.auth = options.auth || null;
  this.proxy = options.proxy || null;
  this.userAgent = 'logs-to-logentries ' + logentries.version;

};

util.inherits(Logentries, events.EventEmitter);

Logentries.prototype.log = function (msg, callback) {

  var self = this,
    logOptions;

  var isBulk = Array.isArray(msg);

  // DISABLE BULK FOR NOW...
  if (isBulk) {
    throw Error('Bulk not supported at this time due to restrictions on POST size limit by logentries');
  }

  function serialize(msg) {
    if (msg instanceof Object) {
      return self.json ? stringify(msg) : common.serialize(msg);
    }
    else {
      return self.json ? stringify({message: msg}) : msg;
    }
  }

  msg = isBulk ? msg.map(serialize).join('\n') : serialize(msg);
  msg = serialize(msg);

  logOptions = {
    uri: this.url,
    method: 'POST',
    body: msg,
    proxy: this.proxy,
    headers: {
      host: this.host,
      accept: '*/*',
      'user-agent': this.userAgent,
      'content-type': this.json ? 'application/json' : 'text/plain',
      'content-length': Buffer.byteLength(msg)
    }
  };

  common.logentries(logOptions, callback, function (res, body) {
    try {
      var result = '';
      if (body) {
        try {
          result = JSON.parse(body);
        } catch (e) {
          // do nothing
          console.error(e);
        }
      }
      self.emit('log', result);
      if (callback) {
        callback(null, result);
      }
    } catch (ex) {
      if (callback) {
        callback(new Error('Unspecified error from Logentries: ' + ex));
      }
    }
  });

  return this;
};


