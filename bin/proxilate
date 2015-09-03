#!/usr/bin/env node
var proxilate = require('../');
var _ = require('lodash');

var argv = require('yargs')
    .usage('Usage: $0 -p [port] --username=[username] --password=[password]')
    .describe('username', 'BasicAuth username')
    .describe('password', 'BasicAuth password')
    .help('h')
    .alias('h', 'help')
    .option('p', {
      alias: 'port',
      describe: 'port',
      default: 9235
    })
    .version(function() {
      return require('../package').version;
    })
    .argv;

var options = _.pick(argv, ['port', 'username', 'password']);
var proxy = proxilate(options);
proxy.start();
