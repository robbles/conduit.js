/*jshint asi: true, node: true, debug: true */

var vows = require('vows'),
assert = require('assert'),
EventEmitter = require('events').EventEmitter,
conduit = require('../conduit');

vows.describe('Components').addBatch({
    'A Component class': {
        topic: function() { return conduit.Component },

        'has an array of known options: ["id"]': function(C) {
            assert.instanceOf(C.prototype.options, Array);
            assert.length(C.prototype.options, 1);
            assert.include(C.prototype.options, 'id');
        },

        'rejects options not in the list by throwing Error': function(C) {
            assert.throws(function() {
                new C({monkey: 'banana'});
            }, Error);
        },

        'throws a helpful TypeError when new keyword is omitted': function(C) {
            assert.throws(function() { C(); }, TypeError);

            try { C() } catch(err) {
                assert.match(err.message, /new/);
                assert.match(err.message, /keyword/);
            }
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


