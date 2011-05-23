/*jshint asi: true, node: true, debug: true */

var vows = require('vows'),
assert = require('assert'),
path = require('path'),
conduit = require('../conduit');

vows.describe('Scripts').addBatch({
    'The Script constructor': {
        topic: function() { return conduit.Script },

        'throws an Error if a command is not given': function(C) {
            assert.throws(function() { new C(); }, Error);
        },

        'accepts the options id, args, env, cwd, encoding, restart': function(C) {
            // check options list
            ['id', 'args', 'env', 'cwd', 'encoding', 'restart'].forEach(function(opt) {
                assert.include(C.prototype.options, opt);
            });
            assert.length(C.prototype.options, 6);

            // try all options just to be safe
            new C('echo', {id:'1', args:[], env:{}, cwd:'.', 
                           encoding:'utf8', restart: 1});
        },

        'throws a helpful TypeError when new keyword is omitted': function(C) {
            assert.throws(function() { C(); }, TypeError);

            try { C() } catch(err) {
                assert.match(err.message, /new/);
                assert.match(err.message, /keyword/);
            }
        },
    },

    'A Script with a command and no options': {
        topic: function() { return new conduit.Script('/bin/echo') },

        'is a subclass of Component': function (i) {
            assert.instanceOf(i, conduit.Component);
        },
        'uses an empty array for the default args': function(i) {
            assert.instanceOf(i.args, Array);
            assert.strictEqual(i.args.length, 0);
        },
        'uses the process environment for the default env': function(i) {
            assert.strictEqual(i.env, process.env);
        },
        'uses the location of the script as the working directory': function(i) {
            assert.strictEqual(i.cwd, path.dirname(__dirname));
        },
        'uses false as the default restart value': function(i) {
            assert.strictEqual(i.restart, false);
        },
        'automatically starts a process': function(i) {
            assert.notStrictEqual(typeof i.process, 'undefined');
            // process pid is always defined but not always a number :/
            assert.notStrictEqual(typeof i.process.pid, 'undefined');
        },
    },

    'A Script with a command and options object': {
        topic: function() { 
            return new conduit.Script('echo', {
                'args':['args'], 'env':{}, 'cwd':'/'
            });
        },
        'sets the argument list': function(i) {
            assert.include(i.args, 'args');
        },
        'sets the environment': function(i) {
            assert.isEmpty(i.env);
        },
        'sets the working directory': function(i) {
            assert.strictEqual(i.cwd, '/');
        },
        'when emitting a message': {
            topic: function(i) {
                i.on('message', this.callback);
            },
            'decodes it in UTF-8': function(msg) {
                assert.strictEqual(msg, 'args');
            }
        }
    },
    'A Script with a different encoding': {
        topic: function() { 
            return function() {
                // will echo back anything written to it
                return new conduit.Script('cat', { encoding: 'base64' });
            };
        },
        'when emitting a message': {
            topic: function(factory) {
                var instance = factory();
                instance.on('message', this.callback);
                // write directly to stdin and listen for message back
                instance.process.stdin.write(new Buffer('output').toString('base64'));
                instance.process.stdin.write('\n');
            },
            'decodes it in the correct encoding': function(msg) {
                assert.strictEqual(msg, 'output');
            }
        },
        'when sent a message': {
            topic: function(factory) {
                var instance = factory();
                // listen directly to stdout and send message
                instance.process.stdout.on('data', this.callback);
                instance.sendMessage('input');
            },
            'encodes it in the correct encoding': function(msg) {
                assert.strictEqual(new Buffer(msg, 'base64').toString(), 'input');
            }
        }
    },

    'A Script with a restart timeout': {
        topic: function() { 
            // will stop immediately
            return new conduit.Script('cat', { restart: 10 });
        },
        'starts a process': function(script) {
            assert.isNumber(script.process.pid);
        },
        'when stopped': {
            topic: function(script) {
                script.pid_original = script.process.pid;
                var callback = this.callback;
                setTimeout(this.callback, 20, script);
                script.process.kill()
            },
            'starts a new process after a short timeout': function(script) {
                assert.isNumber(script.process.pid);
                assert.notStrictEqual(script.pid_original, script.process.pid);
            }
        }
    }
}).exportTo(module, {error: false});


