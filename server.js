'use strict'

var httpProxy = require('http-proxy');
var connect = require('connect');
var _ = require('lodash');
var url = require('url');

var server = connect();
var proxy = new httpProxy.createProxyServer();

// Middleware to perform the redirect
server.use(function (req, res) {
  var forwardUrl = req.url.substr(1);
  var forwardUrlInfo = url.parse(forwardUrl);

  // URL to forward to must be absolute.
  if (!forwardUrlInfo.protocol || !forwardUrlInfo.hostname) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.write('forward url must be absolute');
    return res.end();
  }

  // Reset the request url. It will be set again by http-proxy
  req.url = ''

  // Proxy request
  proxy.web(req, res, {
    changeOrigin: true,
    target: forwardUrl
  });
});

server.listen(9235);
