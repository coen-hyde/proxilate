'use strict'

module.exports = function(username, password) {
  return function(req, res, next) {
    if (req.url === '/healthcheck') {
      res.statusCode = 200;
      res.write("OK");
      return res.end();
    }

    // Lets continue
    next();
  }
}
