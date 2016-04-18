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

describe('Hooks', function() {
  var newPort = helpers.proxy.options.port+1;

  // Create new Proxy Instance with a hooks
  var proxyWithHooks = proxilate({
    port: newPort
  });

  proxyWithHooks.register('backendFetch', function(req, res, options, cb) {
    req.headers['x-random-header'] = 'testing';
    cb();
  });

  var requestor = makeRequestor('http://127.0.0.1:'+newPort);

  before(function(cb) {
    proxyWithHooks.start(cb);
  });

  after(function(cb) {
    proxyWithHooks.stop(cb);
  });

  it('should forward GET requests with no path', function(done) {
    helpers.reqBus.once('request', function(req, res) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      expect(req.headers['x-random-header']).to.equal('testing');
      return res.end();
    });

    requestor('GET', remoteHost+'/', function(err, res) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(200);
      done();
    });
  });
});
