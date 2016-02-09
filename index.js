'use strict'

var httpProxy = require('http-proxy');
var basicAuth = require('basic-auth');
var express = require('express');
var mw = require('./lib/middleware');
var _ = require('lodash');
var url = require('url');
var winston = require('winston');

// Handle uncaught exceptions except when we are in test mode
if (process.env.NODE_ENV !== 'test') {
  winston.handleExceptions(new winston.transports.Console({
    humanReadableUnhandledException: true
  }));
}

/*
 * Create a new Proxilate instance
 *
 * @param options {object} A hash of options given to proxilate
 * @param options.port {integer} The port number to start proxilate on
 */
function Proxilate(options) {
  if (!options) var options = {};

  _.defaults(options, {
    port: 9235,
    forbiddenHosts: []
  });

  this.options = options;
  this.proxy = express();

  this.proxy.use(mw.healthcheck());

  // Add Basic Auth if username or password is specified
  if (this.options.username || this.options.password) {
    winston.info("Using Basic Auth");
    this.proxy.use(mw.auth(this.options.username, this.options.password));
  }

  // Restrict access to forbidden hosts
  this.proxy.use(mw.forbiddenhosts(options.forbiddenHosts));

  // Add Proxy Middleware
  this.proxy.use(mw.proxy());
}

/*
 * Start the proxy
 */
Proxilate.prototype.start = function(cb) {
  if (!cb) cb = function(){};
  var options = this.options;

  this.server = this.proxy.listen(options.port, function(err) {
    if (err) {
      winston.info('Failed to start Proxilate on port: '+options.port);
      return cb(err);
    }

    winston.info('Started Proxilate on port: '+options.port);
    cb();
  });
}

/*
 * Stop the proxy
 */
Proxilate.prototype.stop = function(cb) {
  if (!cb) cb = function(){};
  var options = this.options;

  this.server.close(function(err) {
    if (err) {
      winston.info('Failed to stop Proxilate');
      return cb(err);
    }

    winston.info('Stopped Proxilate');
    cb();
  });
}

module.exports = function(options) {
  return new Proxilate(options);
}
