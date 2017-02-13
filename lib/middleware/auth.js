'use strict'

var basicAuth = require('basic-auth');
var logger = require('../request-logger');

module.exports = function(username, password) {
  return function(req, res, next) {
    var credentials = basicAuth(req);
    var unauthorized = true;

    // Return unauthorized if no credentials or invalid credentials
    if (!credentials) {
      logger('warn', req, 'Basic Auth authentication required')
    }
    else if (credentials.name !== username || credentials.pass !== password) {
      logger('warn', req, 'Authentication failed for user: '+credentials.name+'');
    }
    else {
      unauthorized = false
    }

    if (unauthorized) {
      res.statusCode = 401;
      res.set('WWW-Authenticate', 'Basic realm="Credentials required"');

      return res.end();
    }

    // Lets proxy
    next();
  }
}
