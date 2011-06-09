# conduit.js

A language-agnostic framework for creating real-time, fault-tolerant interfaces
to various protocols, web services and devices. Uses [node.js](http://nodejs.org/).

## Installation with [npm](http://github.com/isaacs/npm)

    npm install conduit


## What is this?!

The idea is to create a library for "glue code" between applications, services,
etc. that is easy to reconfigure and won't fall apart every time it gets bad
input. To work around the relative lack of libraries for node.js, there is
support for managing long-running child processes in any language with a simple
line-based messaging protocol.

So far the following interfaces are implemented:

* XMPP (messaging and publish-subscribe)
* Scripts (long-running child processes that send/receive messages through
  stdout/stdin)
* Web Hooks (preconfigured HTTP request templates that can be fired off
  repeatedly)

Planned built-in interfaces:

* HTTP streaming client (Long polling, WebSockets, and/or SSE)
* OSC and MIDI
* Fault-tolerant wrappers for TCP, UDP sockets and pipes
* ZeroMQ (as soon as some kind of stable node.js wrapper is available)
* Open to suggestions...

Any protocol or service that's not handled directly should be easy to implement
using Scripts (the managed child processes) in some other language that has a
library for it.

## How does it work!!

Check out the examples folder for some use cases (mostly real-world ones I've
been using recently). Most of these are written in coffeescript for readability
and ease-of-use. Sample scripts are in examples/scripts - the simplest one is
`examples/scripts/echo.js`, which just echoes events back to stdout.

Some of the XMPP examples are heavily dependent on your server setup, especialy
the publish-subscribe stuff. YMMV.

## Dependencies

* [node-xmpp](http://github.com/astro/node-xmpp)
* [underscore](http://github.com/documentcloud/underscore)

