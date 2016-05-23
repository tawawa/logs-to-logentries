'use strict';

var logentries = exports;

logentries.version = require('../package.json').version;
logentries.createClient = require('./logentries/client').createClient;

