/*jshint asi: true, node: true, debug: true */

var vows = require('vows'),
assert = require('assert'),
testutil = require('./testutil'),
xmpp = require('node-xmpp'),
conduit = require('../conduit');

vows.describe('XMPP').addBatch({
    'The XMPP constructor': {
        topic: function() { return conduit.XMPP },

        'accepts the options jid, password, port, host, autoconnect': function(C) {

            // check options list
            ['id', 'jid', 'password', 'port', 'host', 'autoconnect'].forEach(function(opt) {
                assert.include(C.prototype.options, opt);
            });
            assert.length(C.prototype.options, 6);

            // try all options just to be safe
            new C({
                jid:'test@4626e38c-a9e8-4df9-9bbe-c57c504cd11f.com',
                password:'pass',
                port:800,
                host:'4626e38c-a9e8-4df9-9bbe-c57c504cd11f.com',
                autoconnect:false
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

        'emits online as emitted by the underlying connection': testutil.expectEvent('online', 1000, 
            function(i) { i.conn.emit('online') }),

        'emits stanza as emitted by the underlying connection': testutil.expectEvent('stanza', 1000, 
            function(i) { i.conn.emit('stanza', new xmpp.XML.Element('fake')) }),

        'emits error as emitted by the underlying connection': testutil.expectEvent('error', 1000, 
            function(i) { i.conn.emit('error', 'message') })

    }

}).exportTo(module, {error: false});


