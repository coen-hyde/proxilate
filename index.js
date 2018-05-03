'use strict'

var httpProxy = require('http-proxy');
var basicAuth = require('basic-auth');
var express = require('express');
var bodyParser = require('body-parser');
var mw = require('./lib/middleware');
var async = require('async');
var _ = require('lodash');
var url = require('url');
var winston = require('winston');
var reqLogger = require('./lib/request-logger');

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
    forbiddenHosts: [],
    proxyTimeout: 15000
  });

  this.options = options;
  this.hooks = {};
  this.proxy = express();

  this.proxy.use(mw.healthcheck());

  // Add Basic Auth if username or password is specified
  if (this.options.username || this.options.password) {
    winston.info("Using Basic Auth");
    this.proxy.use(mw.auth(this.options.username, this.options.password));
  }

  // Restrict access to forbidden hosts
  this.proxy.use(mw.forbiddenhosts(options.forbiddenHosts));

  this.proxy.use(bodyParser.text({type: '*/*'}));

  // Add Proxy Middleware
  this.proxy.use(mw.proxy(this));
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

/*
 * Register a hook
 *
 * @param name {string} The id of the hook
 * @param hook {function} The function to execute
 */
Proxilate.prototype.register = function(name, hook) {
  if (!_.isArray(this.hooks[name])) {
    this.hooks[name] = [];
  }

  this.hooks[name].push(hook);
}

/*
 * Execute a hook
 *
 * @param name {string} The id of the hook
 * @param args {array} Arguments to pass to each executed hook function
 * @param args {function} Callback
 */
Proxilate.prototype.execHook = function(name, args, cb) {
  var req = args[0];
  var res = args[1];

  if (!_.isArray(this.hooks[name]) || this.hooks[name].length === 0) {
    return cb();
  }

  async.each(this.hooks[name], function(func, next) {
    var newArgs = [];

    args.forEach(function (arg) {
      newArgs.push(arg);
    });

    newArgs.push(function(err) {
      if (err) {
        reqLogger('error', req, 'Failed to exectute hook \''+name+'\'. '+err.message);
        res.status(500).send();
        return;
      }

      return next();
    });

    func.apply(null, newArgs);
  }, cb);
}

module.exports = function(options) {
  return new Proxilate(options);
}
