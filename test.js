var expect = require('expect.js');
var http = require('http');
var async = require('async');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var request = require('request');

// Start the proxy
require('./server');

// An event bus that emits a request event when ever the
// target/remote server receives a request
var reqListener = new EventEmitter2();
var responseBody = 'Yay proxied. Path';
var remoteHostHeader = 'x-remote-host';
var remoteHost = '127.0.0.1:7000';

/*
 * Create a dummy remote host that Proxilate will forward requests to
 */
var targetServer = http.createServer(function(req, res) {
  reqListener.emit('request', req);

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write(responseBody);
  return res.end();
}).listen(7000);

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

  async.parallel({
    targetRequest: function(next) {
      reqListener.once('request', function(request) {
        next(null, request);
      });
    },
    res: function(next) {
      request(options, function(err, res, body) {
        next(err, res);
      });
    }
  }, function(err, results) {
    cb(err, results.targetRequest, results.res);
  })

}

function expectValidProxy(done) {
  return function(err, targetRequest, res) {
    expect(err).to.equal(null);

    // Ensure the host header was changed
    expect(targetRequest.headers['host']).to.equal(remoteHost);

    // Ensure we stripped the 'x-remote-host'
    expect(targetRequest.headers[remoteHostHeader]).to.equal(undefined);

    // Did we get a valid response
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.equal(responseBody);
    done();
  }
}


describe('Proxilate', function() {
  it('should return 400 when a request is made without the "x-remote-host" header', function(done) {
    request('http://127.0.0.1:9235/', function(err, res, body) {
      expect(res.statusCode).to.equal(400);
      done();
    });
  });

  it('should forward GET requests', function(done) {
    makeRequest('GET', remoteHost, '/some/path', expectValidProxy(done));
  });

  it('should forward POST requests', function(done) {
    makeRequest('POST', remoteHost, '/some/path', expectValidProxy(done));
  });

  it('should forward PUT requests', function(done) {
    makeRequest('PUT', remoteHost, '/some/path', expectValidProxy(done));
  });

  it('should forward PATCH requests', function(done) {
    makeRequest('PATCH', remoteHost, '/some/path', expectValidProxy(done));
  });

  it('should forward DELETE requests', function(done) {
    makeRequest('DELETE', remoteHost, '/some/path', expectValidProxy(done));
  });


});
