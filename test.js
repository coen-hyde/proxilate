'use strict'

var expect = require('expect.js');
var http = require('http');
var async = require('async');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var request = require('request');

// Start the proxy
require('./server');

// An event bus that emits a request event when ever the
// target/remote server receives a request
var reqBus = new EventEmitter2();
var responseBody = 'Yay proxied. Path';
var remoteHostHeader = 'x-remote-host';
var remoteHost = '127.0.0.1:7000';

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


function testRequest(method, path, responseHandler, cb) {
  reqBus.once('request', responseHandler);
  makeRequest('GET', remoteHost, '/some/path', cb);
}

// A helper function to make a proxy request
function makeRequest(method, host, path, cb) {
  if (!path) {
    path = '/';
  }

  var options = {
    method: method,
    url: 'http://127.0.0.1:9235'+path,
    headers: {}
  }

  options.headers[remoteHostHeader] = host

  request(options, cb);
}

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

describe('Proxilate', function() {
  describe('Failed Proxy Attempts', function() {
    it('should return 400 when a request is made without the "x-remote-host" header', function(done) {
      request('http://127.0.0.1:9235/', function(err, res, body) {
        expect(res.statusCode).to.equal(400);
        done();
      });
    });

    it('should return 404 when attempting to make contact with a server that does not exist', function(done) {
      makeRequest('GET', '127.1.0.1', '/some/path', function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(404);
        done();
      });
    });

    it('should forward 500 GET requests', function(done) {
      testRequest('GET', '/some/path', sendErrorResponse,  function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(500);
        done();
      });
    });
  });

  describe('Successful Proxy Attempts', function() {
    it('should forward GET requests', function(done) {
      testRequest('GET', '/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward POST requests', function(done) {
      testRequest('POST', '/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward PUT requests', function(done) {
      testRequest('PUT', '/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward PATCH requests', function(done) {
      testRequest('PATCH', '/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward DELETE requests', function(done) {
      testRequest('DELETE', '/some/path', sendOkResponse, expectValidProxy(done));
    });
  });
});
