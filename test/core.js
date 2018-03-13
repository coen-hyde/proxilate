var expect = require('expect.js');
var http = require('http');
var url = require('url');
var async = require('async');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var request = require('request');
var _ = require('lodash');

var helpers = require('./helpers');
var proxyHost = helpers.proxyHost;
var remoteHost = helpers.remoteHost;
var testProxyRequest = helpers.testProxyRequest;
var makeRequestor = helpers.makeRequestor;
var expectValidProxy = helpers.expectValidProxy;
var responseBody = helpers.responseBody;
var sendErrorResponse = helpers.sendErrorResponse;
var sendOkResponse = helpers.sendOkResponse;
var sendEchoResponse = helpers.sendEchoResponse;

describe('Core Functionionality', function() {
  it('should return 200 when a request is made to /healthcheck', function(done) {
    request(proxyHost+'/healthcheck', function(err, res, body) {
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal("OK");
      done();
    });
  });
  
  describe('Failed Proxy Attempts', function() {
    it('should return 404 when attempting to make contact with a server that does not exist', function(done) {
      var proxy = makeRequestor(proxyHost);

      proxy('GET', 'http://127.1.0.1/some/path', function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(404);
        done();
      });
    });

    it('should forward 500 GET requests', function(done) {
      testProxyRequest('GET', remoteHost+'/some/path', sendErrorResponse, function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(500);
        done();
      });
    });
  });

  describe('Successful Proxy Attempts', function() {
    it('should forward GET requests with no path', function(done) {
      testProxyRequest('GET', remoteHost+'/', sendOkResponse, expectValidProxy(done));
    });

    it('should forward GET requests with a path', function(done) {
      testProxyRequest('GET', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward GET requests with query params', function(done) {
      testProxyRequest('GET', remoteHost+'/some/path?query=string', sendOkResponse, expectValidProxy(done));
    });

    it('should forward POST requests', function(done) {
      testProxyRequest('POST', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward POST requests when body is included as well', function(done) {
      response = 'testing response'
      testProxyRequest('POST', remoteHost+'/some/path', sendEchoResponse, expectValidProxy(done, response), response);
    });

    it('should forward PUT requests', function(done) {
      testProxyRequest('PUT', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward PATCH requests', function(done) {
      testProxyRequest('PATCH', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward DELETE requests', function(done) {
      testProxyRequest('DELETE', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward requests to target server with Basic Auth', function(done) {
      var listen_response = function(req, res) {
        // Ensure Basic Auth was forwarded
        expect(req.headers['authorization']).to.eql('Basic Ym9iOmNhdA==');

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write(responseBody);
        return res.end();
      }

      testProxyRequest('GET', 'http://bob:cat@127.0.0.1:7000/', listen_response, expectValidProxy(done));
    });

    it('should forward arbitary request headers', function(done) {
      var listen_response = function(req, res) {
        // Ensure Basic Auth was forwarded
        expect(req.headers['x-test']).to.eql('batman');

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write(responseBody);
        return res.end();
      }

      testProxyRequest('GET', 'http://bob:cat@127.0.0.1:7000/', listen_response, {'x-test': 'batman'}, expectValidProxy(done));
    });
  });
});
