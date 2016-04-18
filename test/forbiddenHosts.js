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

describe('Forbidden Hosts', function() {
  var newPort = helpers.proxy.options.port+1;

  var proxyWithForbiddenHosts = proxilate({
    port: newPort,
    forbiddenHosts: ['google.com']
  });

  var requestor = makeRequestor('http://127.0.0.1:'+newPort);

  before(function(cb) {
    proxyWithForbiddenHosts.start(cb);
  });

  beforeEach(function() {
    helpers.reqBus.once('request', sendOkResponse);
  });

  after(function(cb) {
    proxyWithForbiddenHosts.stop(cb);
  })

  it('should return 200 for hosts not in the forbidden list', function(done) {
    requestor('GET', remoteHost+'/', function(err, res) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(200);
      done();
    });
  });

  it('should return 403 for a host in the forbidden host list', function(done) {
    requestor('GET', 'https://google.com/', function(err, res) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(403);
      done();
    });
  });
});
