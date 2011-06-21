/*jshint asi: true, node: true, debug: true */

var vows = require('vows'),
assert = require('assert'),
http = require('http'),
testutil = require('./testutil'),
conduit = require('../conduit');


vows.describe('WebHook').addBatch({
    'The WebHook constructor': {
        topic: function() { return conduit.WebHook },

        'accepts the options host, port, path, method, defaults': function(C) {

            // check options list
            assert.deepEqual(C.prototype.options, 
                ['id', 'host', 'port', 'path', 'method', 'body', 'defaults']);

            // try all options just to be safe
            var hook = new C({
                host: 'localhost',
                port: 8080,
                path: '/upload',
                method: 'POST',
                body: 'hello world',
                defaults: {}
            });
        },

        'throws an Error if host is not given': function(C) {
            assert.throws(function() { new C(); }, Error);
            assert.throws(function() { new C({}); }, Error);
            assert.throws(function() { new C({'port':80}); }, Error);
        }
    },

    'A WebHook with a provided host': {
        topic: function() { 
            return new conduit.WebHook({
                host: 'localhost'
            })
        },

        'is a subclass of Component': function (i) {
            assert.instanceOf(i, conduit.Component);
        },

        'defaults to 80 for the port': function(i) {
            assert.strictEqual(i.port, 80);
        },
        'defaults to / for the path': function(i) {
            assert.strictEqual(i.path, '/');
        },
        'defaults to GET for the method': function(i) {
            assert.strictEqual(i.method, 'GET');
        },
        'defaults to an empty string for the body': function(i) {
            assert.strictEqual(i.body, '');
        },
        'defaults to an empty object for defaults': function(i) {
            assert.instanceOf(i.defaults, Object);
            assert.deepEqual(i.defaults, {});
        }
    },

    'A WebHook': {
        topic: function() { 
            var hook = new conduit.WebHook({
                host: '',
                port: server.address().port,
                path: '/webhooks/{{ value }}/',
                body: 'conduit is {{ adjective }}!',
                method: 'POST'
            });
            this.callback(hook);
        },

        'when making a request': {
            topic: function(hook) {
                server.once('requested', this.callback);
                hook.request({ value: 22, adjective: 'awesome' }) 
            },
            'interpolates the path value correctly': function(req, res) {
                assert.strictEqual(req.url, '/webhooks/22/');
            }
        },

        'when sending the body': {
            topic: function(hook) {
                server.once('body', this.callback);
            },
            'interpolates the body correctly': function(body) {
                assert.strictEqual(body, 'conduit is awesome!');
            }
        }
    }

}).exportTo(module, {error: false});


var server = http.createServer();
server.listen(0, 'localhost');
server.on('request', function(req, res) { 
    var self = this;
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('body\n');
    this.emit('requested', req, res);

    var buffer = [];
    req.on('data', function(data) {
        buffer.push(data);
    });
    req.on('end', function() {
        var body = buffer.join('');
        self.emit('body', body);
    });
});






