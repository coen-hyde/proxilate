'use strict'

var expect = require('expect.js');
var http = require('http');
var url = require('url');
var async = require('async');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var request = require('request');

var proxilate = require('./');
var proxy = proxilate();

before(function(cb){
  proxy.start(cb);
})

// An event bus that emits a request event when ever the
// target/remote server receives a request
var reqBus = new EventEmitter2();
var proxyHost = 'http://127.0.0.1:'+proxy.options.port;
var responseBody = 'Yay proxied. Path';
var remoteHostHeader = 'x-remote-host';
var remoteHost = 'http://127.0.0.1:7000';

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


function testRequest(method, forwardUrl, responseHandler, cb) {
  var forwardUrlInfo = url.parse(forwardUrl);
  var requestor = makeRequestor(proxyHost);

  reqBus.once('request', function(req) {
    var forwardPath = forwardUrlInfo.path;
    expect(req.url).to.equal(forwardPath);

    responseHandler.apply(responseHandler, arguments);
  });

  requestor(method, forwardUrl, cb);
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

// Remove all request event listeners after every test
afterEach(function() {
  reqBus.removeAllListeners('request');
})

describe('Proxilate', function() {
  it('should return 200 when a request is made to /healthcheck', function(done) {
    request('http://127.0.0.1:9235/healthcheck', function(err, res, body) {
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal("OK");
      done();
    });
  });

  describe('Failed Proxy Attempts', function() {
    it('should return 400 when a request is made without the "x-remote-host" header', function(done) {
      request('http://127.0.0.1:9235/', function(err, res, body) {
        expect(res.statusCode).to.equal(400);
        done();
      });
    });

    it('should return 404 when attempting to make contact with a server that does not exist', function(done) {
      var requestor = makeRequestor(proxyHost);

      requestor('GET', 'http://127.1.0.1/some/path', function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(404);
        done();
      });
    });

    it('should forward 500 GET requests', function(done) {
      testRequest('GET', remoteHost+'/some/path', sendErrorResponse,  function(err, res) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(500);
        done();
      });
    });
  });

  describe('Successful Proxy Attempts', function() {
    it('should forward GET requests with no path', function(done) {
      testRequest('GET', remoteHost+'/', sendOkResponse, expectValidProxy(done));
    });

    it('should forward GET requests with a path', function(done) {
      testRequest('GET', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward GET requests with query params', function(done) {
      testRequest('GET', remoteHost+'/some/path?query=string', sendOkResponse, expectValidProxy(done));
    });

    it('should forward POST requests', function(done) {
      testRequest('POST', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward PUT requests', function(done) {
      testRequest('PUT', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward PATCH requests', function(done) {
      testRequest('PATCH', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward DELETE requests', function(done) {
      testRequest('DELETE', remoteHost+'/some/path', sendOkResponse, expectValidProxy(done));
    });

    it('should forward requests to target server with Basic Auth', function(done) {
      var listen_response = function(req, res) {
        // Ensure Basic Auth was forwarded
        expect(req.headers['authorization']).to.eql('Basic Ym9iOmNhdA==');

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write(responseBody);
        return res.end();
      }

      testRequest('GET', 'http://bob:cat@127.0.0.1:7000/', listen_response, expectValidProxy(done));
    });
  });

  describe('Basic Auth', function() {
    var newPort = proxy.options.port+1;
    var username = 'bruce';
    var password = 'batman';

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
      reqBus.once('request', sendOkResponse);
    });

    after(function(cb) {
      proxyWithBasicAuth.stop(cb);
    });

    it('should return 401 when no authentication is provided', function(done) {
      requestor('GET', remoteHost+'/some/path', function(err, res) {
        expect(err).to.equal(null);
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

        requestor('GET', remoteHost+'/some/path', headers, function(err, res) {
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

        requestor('GET', remoteHost+'/some/path', headers, function(err, res) {
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
        requestorWithAuth('GET', remoteHost+'/some/path', function(err, res) {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);
          done();
        });
      });

      var hostWithBadAuth = 'http://tony:pony@127.0.0.1:'+newPort;
      var requestorWithBadAuth = makeRequestor(hostWithBadAuth);

      it('should return 401 with invalid credentials', function(done) {
        requestorWithBadAuth('GET', remoteHost+'/some/path', function(err, res) {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(401);
          done();
        });
      });
    });
  });

  describe('Forbidden Hosts', function() {
    var newPort = proxy.options.port+1;

    var proxyWithForbiddenHosts = proxilate({
      port: newPort,
      forbiddenHosts: ['google.com']
    });

    var requestor = makeRequestor('http://127.0.0.1:'+newPort);

    before(function(cb) {
      proxyWithForbiddenHosts.start(cb);
    });

    beforeEach(function() {
      reqBus.once('request', sendOkResponse);
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
});
