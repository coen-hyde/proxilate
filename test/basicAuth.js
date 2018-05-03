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

describe('Basic Auth', function() {
  var newPort = helpers.proxy.options.port+1;
  var username = 'bruce';
  var password = 'batman';

  // Create new Proxy Instance with Basic Auth enabled
  var proxyWithBasicAuth = proxilate({
    port: newPort,
    username: username,
    password: password
  });

  var requestor = makeRequestor('http://127.0.0.1:'+newPort);

  before(function(cb) {
    proxyWithBasicAuth.start(cb);
  });

  beforeEach(function() {
    helpers.reqBus.once('request', sendOkResponse);
  });

  after(function(cb) {
    proxyWithBasicAuth.stop(cb);
  });

  it('should return 401 when no authentication is provided', function(done) {
    requestor({ method: 'GET', url: remoteHost+'/some/path'}, function(err, res) {
      expect(err).to.equal(null);
      expect(res.headers['www-authenticate']).to.equal('Basic realm="Credentials required"');
      expect(res.statusCode).to.equal(401);
      done();
    });
  });

  describe('credentials in Authorization header', function() {
    it('should return 200 with valid credentials', function(done) {
      var authorization = 'Basic '+new Buffer(username+':'+password).toString('base64');
      var headers = {
        'Authorization': authorization
      }

      requestor({ method: 'GET', url: remoteHost+'/some/path', headers: headers}, function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(200);
        done();
      });
    });

    it('should return 401 with invalid credentials', function(done) {
      var badAuthorization = 'Basic '+new Buffer('tony:pony').toString('base64');
      var headers = {
        'Authorization': badAuthorization
      }

      requestor({ method: 'GET', url: remoteHost+'/some/path', headers: headers}, function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(401);
        done();
      });
    });
  });

  describe('credentials in URL', function() {
    var hostWithAuth = 'http://'+username+':'+password+'@127.0.0.1:'+newPort;
    var requestorWithAuth = makeRequestor(hostWithAuth);

    it('should return 200 with valid credentials', function(done) {
      requestorWithAuth({ method: 'GET', url: remoteHost+'/some/path'}, function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(200);
        done();
      });
    });

    var hostWithBadAuth = 'http://tony:pony@127.0.0.1:'+newPort;
    var requestorWithBadAuth = makeRequestor(hostWithBadAuth);

    it('should return 401 with invalid credentials', function(done) {
      requestorWithBadAuth({ method: 'GET', url: remoteHost+'/some/path'}, function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(401);
        done();
      });
    });
  });
});
