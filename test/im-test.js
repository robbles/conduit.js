/*jshint asi: true, node: true, debug: true */

var vows = require('vows'),
assert = require('assert'),
testutil = require('./testutil'),
xmpp = require('node-xmpp'),
conduit = require('../conduit');

vows.describe('XMPP').addBatch({
    'The XMPP constructor': {
        topic: function() { return conduit.XMPP },

        'accepts the options jid, password, port, host, reconnect': function(C) {

            // check options list
            assert.deepEqual(C.prototype.options, ['id', 'jid', 'password', 'port', 'host', 'reconnect']);

            // try all options just to be safe
            new C({
                jid:'test@4626e38c-a9e8-4df9-9bbe-c57c504cd11f.com',
                password:'pass',
                port:800,
                host:'4626e38c-a9e8-4df9-9bbe-c57c504cd11f.com',
                reconnect:5
            });
        },

        'throws an Error if jid and password are not given': function(C) {
            assert.throws(function() { new C(); }, Error);
            assert.throws(function() { new C({}); }, Error);
            assert.throws(function() { new C({'jid':'test@4626e38c-a9e8-4df9-9bbe-c57c504cd11f.com'}); }, Error);
            assert.throws(function() { new C({'password':'pass'}); }, Error);
        }
    },

    'A XMPP with a provided JID and password': {
        topic: function() { 
            return new conduit.XMPP({
                jid: 'example@test.com',
                password: 'password'
            })
        },

        'is a subclass of Component': function (i) {
            assert.instanceOf(i, conduit.Component);
        },

        'defaults to false for reconnect option': function(i) {
            assert.strictEqual(i.reconnect, false);
        },

        'emits online when emitted by the underlying connection': testutil.expectEvent('online', 1000, 
            function(i) { i.connection.emit('online') }),

        'emits stanza when emitted by the underlying connection': testutil.expectEvent('stanza', 1000, 
            function(i) { i.connection.emit('stanza', new xmpp.XML.Element('fake')) }),

        'emits error when emitted by the underlying connection': testutil.expectEvent('error', 1000, 
            function(i) { i.connection.emit('error', 'message') }),

        'if reconnect is false': {
            topic: function(i) {
                // force error condition
                i.connection.emit('error', 'message');
                setTimeout(this.callback, 10, i, i.connection);
            },

            'does not reconnect automatically': function(i, lastconn) {
                // make sure connection hasn't changed
                assert.strictEqual(i.connection, lastconn);
            }
        }
    },

    'A XMPP with reconnect = [a number]': {
        topic: function() { 
            var timeout = 10;

            var xmpp = new conduit.XMPP({
                jid: 'example@test.com',
                password: 'password',
                reconnect: timeout
            });
            var first_conn = xmpp.connection;

            setTimeout(this.callback, timeout, xmpp, first_conn);
        },

        'reconnects after an error condition': function(xmpp, first_conn) {
            assert.notStrictEqual(this.first_conn, xmpp);
        }
    }


}).exportTo(module, {error: false});


