'use strict'

var _ = require('lodash');
var url = require('url');
var logger = require('../request-logger');

module.exports = function(hosts) {
  return function(req, res, next) {
    var forwardUrl = req.originalUrl.substr(1);
    var forwardUrlInfo = url.parse(forwardUrl);

    // Return 403 if destination host is in list of forbidden hosts
    if (_.isArray(hosts) && hosts.indexOf(forwardUrlInfo.hostname) > -1) {
      res.statusCode = 403;
      res.write("Host Forbidden");
      logger('warn', req, 'Destination host forbidden');
      return res.end();
    }

    // Lets continue
    next();
  }
}
