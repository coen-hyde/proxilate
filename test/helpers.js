'use strict'

var expect = require('expect.js');
var http = require('http');
var url = require('url');
var async = require('async');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var request = require('request');
var _ = require('lodash');

var proxilate = require('../');
var proxy = proxilate();

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
var targetServer = http.createServer(function(req, res) {
  reqBus.emit('request', req, res);
}).listen(7000);


// Respond with a 200
function sendOkResponse(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write(responseBody);
  return res.end();
}

// Respond with an internal server error
function sendErrorResponse(req, res) {
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  return res.end();
}


function testProxyRequest(method, forwardUrl, responseHandler, headers, cb) {
  if (_.isFunction(headers)) {
    cb = headers;
    headers = {};
  }

  var forwardUrlInfo = url.parse(forwardUrl);
  var requestor = makeRequestor(proxyHost);

  reqBus.once('request', function(req) {
    var forwardPath = forwardUrlInfo.path;
    expect(req.url).to.equal(forwardPath);

    responseHandler.apply(responseHandler, arguments);
  });

  requestor(method, forwardUrl, headers, cb);
}

// A helper function to make a proxy request
function makeRequestor(proxyHost) {
  return function(method, forwardUrl, headers, cb) {
    if (!cb) {
      var cb = headers;
      headers = {};
    }

    var options = {
      method: method,
      url: proxyHost+'/'+forwardUrl,
      headers: headers
    }

    request(options, cb);
  }
};

// Validate a proxy request and response to be valid
function expectValidProxy(done) {
  return function(err, res) {
    expect(err).to.equal(null);

    // Did we get a valid response
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.equal(responseBody);
    done();
  }
}

module.exports = {
  reqBus: reqBus,
  proxy: proxy,
  proxyHost: proxyHost,
  sendOkResponse: sendOkResponse,
  sendErrorResponse: sendErrorResponse,
  testProxyRequest: testProxyRequest,
  makeRequestor: makeRequestor,
  expectValidProxy: expectValidProxy,
  responseBody: responseBody,
  remoteHost: remoteHost
}
