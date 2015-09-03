Proxilate
=========

A simple proxy server

Installation
------------

```$ npm install -g proxilate```

Starting Proxilate
------------------

```$ proxilate```

### Options

```
Usage: $0 -p [port] --username=[username] --password=[password]
```

The server listens on port 9235 by default.

Usage
-----

Make a request to the proxilate server with the forward url as the path. eg.

```
$ curl http://127.0.0.1:9235/https://www.google.com
```
