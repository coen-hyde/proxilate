'use strict'

var httpProxy = require('http-proxy');
var url = require('url');
var logger = require('../request-logger');

module.exports = function() {
  // Setup proxy
  var proxy = new httpProxy.createProxyServer();

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
  };
}
