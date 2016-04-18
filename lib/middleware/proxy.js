'use strict'

var httpProxy = require('http-proxy');
var url = require('url');
var logger = require('../request-logger');

module.exports = function(proxilate) {
  // Setup proxy
  var proxy = new httpProxy.createProxyServer({
    secure: true
  });

  var target = proxilate.options.target;

  // Listen for the `error` event on `proxy`.
  proxy.on('error', function (err, req, res) {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    var msg = 'Proxy request to "'+req.url+'" failed.';
    logger('error', req, 'Proxy request failed');
    res.end(msg);
  });

  proxy.on('proxyRes', function (proxyRes, req, res) {
    logger('info', req, 'Destination returned '+proxyRes.statusCode+'');
  });

  // Middleware to perform the redirect
  return function (req, res, next) {
    var forwardUrl = req.originalUrl.substr(1);
    var forwardUrlInfo = url.parse(forwardUrl);

    if (target) {
      var forwardHost = target;
    }
    else {
      // URL to forward to must be absolute if we did not specify a backend target
      if (!forwardUrlInfo.protocol || !forwardUrlInfo.hostname) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.write('forward url must be absolute');
        return res.end();
      }

      var forwardHost = forwardUrlInfo.protocol+"//"+forwardUrlInfo.host;
    }

    // var forwardPath = forwardUrl.substring(forwardUrl.indexOf(forwardUrlInfo.path));
    req.url = forwardUrlInfo.path;


    var options = {
      changeOrigin: true,
      target: forwardHost
    }

    if (forwardUrlInfo.auth) {
      options.auth = forwardUrlInfo.auth;
    }

    proxilate.execHook('backendFetch', [req, res, options], function(err) {
      // Proxy request
      proxy.web(req, res, options);
    });
  };
}
