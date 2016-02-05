'use strict'

var basicAuth = require('basic-auth');
var winston = require('winston');

module.exports = function(username, password) {
  return function(req, res, next) {
    var credentials = basicAuth(req);
    var unauthorized = true;

    // Return unauthorized if no credentials or invalid credentials
    if (!credentials) {
      winston.warn("Basic Auth authentication required")
    }
    else if (credentials.name !== username || credentials.pass !== password) {
      winston.warn("Authentication failed for user: \""+credentials.name+"\"")
    }
    else {
      unauthorized = false
    }

    if (unauthorized) {
      res.statusCode = 401;
      return res.end();
    }

    // Lets proxy
    next();
  }
}
