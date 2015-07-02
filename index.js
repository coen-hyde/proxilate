'use strict'

var httpProxy = require('http-proxy');
var connect = require('connect');
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

  var proxy = new httpProxy.createProxyServer();

  // Middleware to perform the redirect
  this.server.use(function (req, res) {
    var forwardUrl = req.originalUrl.substr(1);
    var forwardUrlInfo = url.parse(forwardUrl);

    // URL to forward to must be absolute.
    if (!forwardUrlInfo.protocol || !forwardUrlInfo.hostname) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.write('forward url must be absolute');
      return res.end();
    }

    var forwardPath = forwardUrl.substring(forwardUrl.indexOf(forwardUrlInfo.path));
    req.url = forwardPath;

    var forwardHost = forwardUrl.substring(0, forwardUrl.indexOf(forwardUrlInfo.path));

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

module.exports = function() {
  return new Proxilate();
}
