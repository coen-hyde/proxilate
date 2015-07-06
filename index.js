'use strict'

var httpProxy = require('http-proxy');
var connect = require('connect');
var basicAuth = require('basic-auth');
var _ = require('lodash');
var url = require('url');

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

  // Add Basic Auth if username or password is specified
  if (this.options.username || this.options.password) {
    this.server.use(function(req, res, next) {
      var credentials = basicAuth(req);

      // Return unauthorized if no credentials or invalid credentials
      var unauthorized = (
        !credentials ||
        credentials.name !== options.username ||
        credentials.pass !== options.password
      );

      if (unauthorized) {
        res.statusCode = 401;
        return res.end();
      }

      // Lets proxy
      next();
    });
  }

  // Setup proxy
  var proxy = new httpProxy.createProxyServer();

  // Listen for the `error` event on `proxy`.
  proxy.on('error', function (err, req, res) {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Something went wrong. And we are reporting a custom error message.');
  });

  // Middleware to perform the redirect
  this.server.use(function (req, res, next) {
    var forwardUrl = req.originalUrl.substr(1);
    var forwardUrlInfo = url.parse(forwardUrl);

    // URL to forward to must be absolute.
    if (!forwardUrlInfo.protocol || !forwardUrlInfo.hostname) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.write('forward url must be absolute');
      return res.end();
    }

    // var forwardPath = forwardUrl.substring(forwardUrl.indexOf(forwardUrlInfo.path));
    req.url = forwardUrlInfo.path;

    var forwardHost = forwardUrlInfo.protocol+"//";
    if (forwardUrlInfo.auth) {
      forwardHost += forwardUrlInfo.auth+'@';
    }
    forwardHost += forwardUrlInfo.host;

    // Proxy request
    proxy.web(req, res, {
      changeOrigin: true,
      target: forwardHost
    });
  });
}

/*
 * Start the proxy
 */
Proxilate.prototype.start = function(cb) {
  if (!cb) cb = function(){};
  var options = this.options;

  this.server.listen(options.port, function(err) {
    if (err) {
      console.log('Failed to start Proxilate on port: '+options.port);
      return cb(err);
    }

    console.log('Started Proxilate on port: '+options.port);
    cb();
  });
}

module.exports = function(options) {
  return new Proxilate(options);
}
