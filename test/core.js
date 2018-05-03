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
    request({ method: 'GET', url: proxyHost+'/healthcheck'}, function(err, res, body) {
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal("OK");
      done();
    });
  });

  describe('Failed Proxy Attempts', function() {
    it('should return 504 when backend request timesout', function(done) {
      var proxy = makeRequestor(proxyHost);
      proxy({ method: 'GET', url: 'http://127.1.0.1/some/path'}, function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(504);
        done();
      });
    });

    it('should forward 500 GET requests', function(done) {
      testProxyRequest({ method: 'GET', url: remoteHost+'/some/path', responseHandler: sendErrorResponse}, function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(500);
        done();
      });
    });
  });

  describe('Successful Proxy Attempts', function() {
    it('should forward GET requests with no path', function(done) {
      testProxyRequest({ method: 'GET', url: remoteHost+'/', responseHandler: sendOkResponse}, expectValidProxy(done));
    });

    it('should forward GET requests with a path', function(done) {
      testProxyRequest({ method: 'GET', url: remoteHost+'/some/path', responseHandler: sendOkResponse}, expectValidProxy(done));
    });

    it('should forward GET requests with query params', function(done) {
      testProxyRequest({ method: 'GET', url: remoteHost+'/some/path?query=string', responseHandler: sendOkResponse}, expectValidProxy(done));
    });

    it('should forward POST requests', function(done) {
      testProxyRequest({ method: 'POST', url: remoteHost+'/some/path', responseHandler: sendOkResponse}, expectValidProxy(done));
    });

    it('should forward POST requests when body is included as well', function(done) {
      var body = 'testing body';
      testProxyRequest({ method: 'POST', url: remoteHost+'/some/path', body: body, responseHandler: sendEchoResponse}, expectValidProxy(body, done));
    });

    it('should forward PUT requests', function(done) {
      testProxyRequest({ method: 'PUT', url: remoteHost+'/some/path', responseHandler: sendOkResponse}, expectValidProxy(done));
    });

    it('should forward PATCH requests', function(done) {
      testProxyRequest({ method: 'PATCH', url: remoteHost+'/some/path', responseHandler: sendOkResponse}, expectValidProxy(done));
    });

    it('should forward DELETE requests', function(done) {
      testProxyRequest({ method: 'DELETE', url: remoteHost+'/some/path', responseHandler: sendOkResponse}, expectValidProxy(done));
    });

    it('should forward requests to target server with Basic Auth', function(done) {
      var listen_response = function(req, res) {
        // Ensure Basic Auth was forwarded
        expect(req.headers['authorization']).to.eql('Basic Ym9iOmNhdA==');

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write(responseBody);
        return res.end();
      }

      testProxyRequest({ method: 'GET', url: 'http://bob:cat@127.0.0.1:7000/', responseHandler: listen_response}, expectValidProxy(done));
    });

    it('should forward arbitary request headers', function(done) {
      var listen_response = function(req, res) {
        // Ensure Basic Auth was forwarded
        expect(req.headers['x-test']).to.eql('batman');

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write(responseBody);
        return res.end();
      }

      var testParams = {
        method: 'GET',
        url: 'http://bob:cat@127.0.0.1:7000/',
        headers: {'x-test': 'batman'},
        responseHandler: listen_response
      };

      testProxyRequest(testParams, expectValidProxy(done));
    });
  });
});
