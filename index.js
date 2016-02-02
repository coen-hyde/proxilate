'use strict'

var httpProxy = require('http-proxy');
var basicAuth = require('basic-auth');
var connect = require('connect');
var mw = require('./lib/middleware');
var _ = require('lodash');
var url = require('url');
var winston = require('winston');

winston.handleExceptions(new winston.transports.Console({
  humanReadableUnhandledException: true
}));

/*
 * Create a new Proxilate instance
 *
 * @param options {object} A hash of options given to proxilate
 * @param options.port {integer} The port number to start proxilate on
 */
function Proxilate(options) {
  if (!options) var options = {};

  _.defaults(options, {
    port: 9235
  })

  this.options = options;
  this.server = connect();

  this.server.use(mw.healthcheck());

  // Add Basic Auth if username or password is specified
  if (this.options.username || this.options.password) {
    this.server.use(mw.auth(this.options.username, this.options.password));
  }

  // Add Proxy Middleware
  this.server.use(mw.proxy());
}

/*
 * Start the proxy
 */
Proxilate.prototype.start = function(cb) {
  if (!cb) cb = function(){};
  var options = this.options;

  this.server.listen(options.port, function(err) {
    if (err) {
      winston.info('Failed to start Proxilate on port: '+options.port);
      return cb(err);
    }

    winston.info('Started Proxilate on port: '+options.port);
    cb();
  });
}

module.exports = function(options) {
  return new Proxilate(options);
}
