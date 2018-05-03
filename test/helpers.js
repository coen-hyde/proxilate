'use strict'

var expect = require('expect.js');
var http = require('http');
var url = require('url');
var async = require('async');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var request = require('request');
var _ = require('lodash');

var express = require('express');
var bodyParser = require('body-parser');

var proxilate = require('../');
var proxy = proxilate({
  proxyTimeout: 1000
});

// An event bus that emits a request event when ever the
// target/remote server receives a request
var reqBus = new EventEmitter2();
var proxyHost = 'http://127.0.0.1:'+proxy.options.port;
var responseBody = 'Yay proxied. Path';
var remoteHost = 'http://127.0.0.1:7000';

before(function(cb){
  proxy.start(cb);
});

// Remove all request event listeners after every test
afterEach(function() {
  reqBus.removeAllListeners('request');
});

/*
 * Create a dummy remote host that Proxilate will forward requests to.
 * Fires a request event on the reqBus. Tests must listen and respond to this event
 */

var targetServer = express();
targetServer.use(bodyParser.text({type: '*/*'}));
targetServer.all('/*', function(req, res, next) {
  reqBus.emit('request', req, res);
});

targetServer.listen(7000, function() {
  console.log('Started backend on port: '+7000);
});

// Respond with a 200
function sendOkResponse(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write(responseBody);
  return res.end();
}

// Respond with a 200 and echo back the request body
function sendEchoResponse(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  if (req.body) {
    res.write(req.body);
  }
  return res.end();
}

// Respond with an internal server error
function sendErrorResponse(req, res) {
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  return res.end();
}

// Respond with an internal server error
function sendTeapotResponse(req, res) {
  res.writeHead(418, { 'Content-Type': 'text/plain' });
  return res.end();
}

// function testProxyRequest(method, forwardUrl, responseHandler, headers, cb, body) {
function testProxyRequest(options, cb) {
  // Make headers options
  // if (_.isFunction(headers)) {
  //   // Make callback optional
  //   if (_.isString(cb)) {
  //     body = cb;
  //   }
  //   cb = headers;
  //   headers = {};
  // }

  var forwardUrlInfo = url.parse(options.url);
  var requestor = makeRequestor(proxyHost);

  reqBus.once('request', function(req) {
    var forwardPath = forwardUrlInfo.path;
    expect(req.url).to.equal(forwardPath);

    options.responseHandler.apply(options.responseHandler, arguments);
  });

  // requestor(method, forwardUrl, headers, cb, body);
  requestor(options, cb);
}

// A helper function to make a proxy request
function makeRequestor(proxyHost) {
  // return function(method, forwardUrl, headers, cb, body) {
  return function(options, cb) {
    _.defaults(options, {
      headers: {}
    });

    // if (_.isFunction(headers)) {
    //   if (_.isString(cb)) {
    //     body = cb;
    //   }
    //   var cb = headers;
    //   headers = {};
    // }

    var params = {
      method: options.method,
      url: proxyHost+'/'+options.url,
      headers: options.headers,
    }

    if (options.body) {
      params.body = options.body;
      params.headers['Content-Type'] = 'text/plain';
    }

    request(params, cb);
  }
};

// Validate a proxy request and response to be valid
function expectValidProxy(body, cb) {
  if (_.isFunction(body)) {
    cb = body
    body = undefined
  }

  return function(err, res) {
    expect(err).to.equal(null);

    // Did we get a valid response
    expect(res.statusCode).to.equal(200);
    if (body) expect(res.body).to.equal(body);
    cb();
  }
}

function newProxy(options) {
  var newPort = proxy.options.port+1;
  options = options || {};

  _.defaults(options, {
    port: newPort
  });

  // Create new Proxy Instance with a hooks
  var newProxy = proxilate(options);

  return proxy;
}

module.exports = {
  reqBus: reqBus,
  proxy: proxy,
  proxyHost: proxyHost,
  sendOkResponse: sendOkResponse,
  sendEchoResponse: sendEchoResponse,
  sendErrorResponse: sendErrorResponse,
  sendTeapotResponse: sendTeapotResponse,
  testProxyRequest: testProxyRequest,
  makeRequestor: makeRequestor,
  expectValidProxy: expectValidProxy,
  responseBody: responseBody,
  remoteHost: remoteHost,
  newProxy: newProxy
}
