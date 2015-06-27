'use strict'

var httpProxy = require('http-proxy');
var connect = require('connect');
var http = require('http');
var url = require('url');

/*
 * Create the Target url for the redirect
 *
 * Replaces the host in the request url with another
 *
 * @param req {object} The request object
 * @param remoteHost {string} The new remoteHost
 * @return {string}
 */
function createTargetUrl(req, remoteHost) {
  var protocol = (req.protocol)? req.protocol : 'http';
  var hostname = remoteHost.split(':')[0];
  var port = remoteHost.split(':')[1];

  if (!port) {
    port = (req.protocol === 'https')? 443 : 80;
  }

  var target = {
    protocol: protocol,
    hostname: hostname,
    port: port
  }

  return url.format(target);
}

var server = connect();
var proxy = new httpProxy.createProxyServer();

// Middleware to perform the redirect
server.use(function (req, res) {
  var remoteHost = req.headers['x-remote-host'];
  delete req.headers['x-remote-host'];

  // If we do not have a remote host, then this request is invalid
  if (!remoteHost) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end();
  }

  // Proxy request
  proxy.web(req, res, {
    changeOrigin: true,
    target: createTargetUrl(req, remoteHost)
  });
});

server.listen(9235);
