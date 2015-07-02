#!/usr/bin/env node
var proxilate = require('../');

var argv = require('yargs')
    .usage('Usage: $0 -p [port]')
    .default('p', 9235);

var proxy = proxilate({
  port: argv.p
})

proxy.start();
