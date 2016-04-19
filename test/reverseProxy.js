var expect = require('expect.js');
var http = require('http');
var url = require('url');
var async = require('async');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var request = require('request');
var _ = require('lodash');

var proxilate = require('../');

var helpers = require('./helpers');
var proxyHost = helpers.proxyHost;
var remoteHost = helpers.remoteHost;
var testProxyRequest = helpers.testProxyRequest;
var makeRequestor = helpers.makeRequestor;
var expectValidProxy = helpers.expectValidProxy;
var responseBody = helpers.responseBody;
var sendErrorResponse = helpers.sendErrorResponse;
var sendOkResponse = helpers.sendOkResponse;
var sendTeapotResponse = helpers.sendTeapotResponse;

describe('Reverse Proxy', function() {
  var newPort = helpers.proxy.options.port+1;

  // Create new Proxy Instance with a hardcoded target host
  var reverseProxy = proxilate({
    port: newPort,
    target: remoteHost
  });

  var requestor = makeRequestor('http://127.0.0.1:'+newPort);

  before(function(cb) {
    reverseProxy.start(cb);
  });

  beforeEach(function() {
    helpers.reqBus.once('request', sendTeapotResponse);
  });

  after(function(cb) {
    reverseProxy.stop(cb);
  });

  it('should forward GET requests with no path', function(done) {
    requestor('GET', '', function(err, res) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(418);
      done();
    });
  });
});
