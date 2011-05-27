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
    },

    'the objectSlice function': {
        topic: function() {
            this.original = {'a': 10, 'b':20, 'c':30};
            return conduit.objectSlice(this.original, ['a', 'c']); 
        },

        'returns a new object': function(o) {
            assert.notStrictEqual(o, this.original);
        },

        'returns an object with the keys given in an array': function(o) {
            assert.strictEqual(o.a, this.original.a);
            assert.include(o.c, this.original.c);
            assert.isUndefined(o.b);
        }
    }

}).exportTo(module)


