'use strict'

var basicAuth = require('basic-auth');

module.exports = function(username, password) {
  return function(req, res, next) {
    var credentials = basicAuth(req);

    // Return unauthorized if no credentials or invalid credentials
    var unauthorized = (
      !credentials ||
      credentials.name !== username ||
      credentials.pass !== password
    );

    if (unauthorized) {
      res.statusCode = 401;
      return res.end();
    }

    // Lets proxy
    next();
  }
}
