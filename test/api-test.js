/*jshint asi: true, node: true, debug: true */

var vows = require('vows'),
assert = require('assert'),
path = require('path'),
EventEmitter = require('events').EventEmitter,
conduit = require('../conduit');

/* Use to check if a signal is called, with a error timeout in ms */
var expectEvent = function(signal, timeout) {
    return {
        topic: function(i) {
            var timer = setTimeout(this.callback, timeout, true);
            i.on(signal, clearTimeout, timer);
            i.on(signal, this.callback);
        },
        '': function(err) {
            assert.isUndefined(err, 'Timeout waiting for callback');
        }
    };
};

vows.describe('Components').addBatch({
    'A Component class': {
        topic: function() { return conduit.Component },

        'has an array of known options': function(Component) {
            assert.instanceOf(Component.prototype.options, Array);
        },

        'rejects options not in the list': function(Component) {
            assert.throws(function() {
                new Component({monkey: 'banana'});
            }, Error);
        },

        'created with no options': {
            topic: function() { return new conduit.Component() },

            'is a subclass of EventEmitter': function (component) {
                assert.instanceOf(component, EventEmitter);
            },
            'generates an ID': function(component) {
                assert.notEqual(component.id, null);
            },
            'has a unique ID': function(component) {
                var c2 = new conduit.Component();
                assert.notStrictEqual(component.id, c2.id);
            },
        },
        'created with a given ID': {
            topic: function() { return new conduit.Component({id:'42'}) },

            'uses the given ID': function(component) {
                assert.strictEqual(component.id, '42');
            },
        },
    }
}).exportTo(module)

vows.describe('Scripts').addBatch({
    'The Script constructor': {
        topic: function() { return conduit.Script },

        'throws an Error if a command is not given': function(C) {
            assert.throws(function() { new C(); }, Error);
        },

        'accepts the options id, args, env, cwd, encoding': function(C) {
            // check options list
            ['id', 'args', 'env', 'cwd', 'encoding'].forEach(function(opt) {
                assert.include(C.prototype.options, opt);
            });

            // try all options just to be safe
            new C('echo', {id:'1', args:[], env:{}, cwd:'.', encoding:'utf8'});
        }
    },

    'A Script with a command and no options': {
        topic: function() { return new conduit.Script('/bin/echo') },

        'is a subclass of Component': function (i) {
            assert.instanceOf(i, conduit.Component);
        },
        'uses an empty array for the default args': function(i) {
            assert.instanceOf(i.args, Array);
            assert.equal(i.args.length, 0);
        },
        'uses the process environment for the default env': function(i) {
            assert.equal(i.env, process.env);
        },
        'uses the location of the script as the working directory': function(i) {
            assert.equal(i.cwd, path.dirname(__dirname));
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
    }
}).exportTo(module, {error: false});

