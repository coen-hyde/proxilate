var winston = require('winston');

module.exports = function(type, req, msg) {
  winston.log(type, 'datetime: "'+new Date().toISOString()+'", src: "'+req.ip+'", dest: "'+req.originalUrl.substr(1)+'", msg: "'+msg+'"')
}
