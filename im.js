var sys = require('sys'),
    util = require('util'),
    xmpp = require('node-xmpp'),
    $ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    conduit = require('./conduit'),
    Component = require('./conduit').Component;

/*
 * Manages connection to the XMPP server
 */
var XMPP = function(opt) {
    Component.call(this, opt);
    
    if(typeof opt.jid === 'undefined') {
        throw new Error('JID must be provided');
    }
    if(typeof opt.password === 'undefined') {
        throw new Error('password must be provided');
    }

    this.jid = opt.jid;
    this.password = opt.password;
    this.reconnect = opt.reconnect || false;
    this.conn_opt = conduit.objectSlice(opt, 
        ['jid', 'password', 'port', 'host']);

    this.connect();
};


sys.inherits(XMPP, Component);
Component.extendOptions(Component, XMPP, 
    ['jid', 'password', 'port', 'host', 'reconnect']);
exports.XMPP = XMPP;


XMPP.prototype.connect = function() {
    this.connection = new xmpp.Client(this.conn_opt);

    this.connection.on('online', $(this.clientOnline).bind(this));
    this.connection.on('stanza', $(this.handleStanza).bind(this));
    this.connection.on('error', $(this.handleError).bind(this));
};


XMPP.prototype.clientOnline = function() {
    // Send default presence
    this.connection.send(
        new xmpp.Element('presence', { from: this.jid })
            .c('show').t('chat').up()
            .c('status').t("online")
    );

    this.emit('online', this.connection);
};

XMPP.prototype.handleStanza = function(stanza) {
    this.emit('stanza', stanza);

    if (stanza.is('message')) {
        if(stanza.attrs.type !== 'error') {
            this.emit('message', stanza);
        }
        else {
            this.emit('error', stanza);
        }
    }

    if(stanza.is('iq')) {
        // emit unique events for each iq ID
        var iqid = stanza.attrs.id;
        this.emit('iq:' + iqid, stanza);
    }
};

XMPP.prototype.handleError = function(error) {
    // Capture error when no listeners are present
    if(!this.listeners('error').length) {
        this.debug("unhandled error: " + error);
    } else {
        this.emit('error', error);
    }

    // restart XMPP connection
    this.connection.end();
    if(this.reconnect) {
        setTimeout($(this.connect).bind(this), this.reconnect);
    }
};

/*
 * Utility function for spitting out debug info
 */
XMPP.prototype.debug = function(msg) {
    util.debug([this, ': ',  msg].join(' '));
};

XMPP.prototype.toString = function() {
    return ['[XMPP ', this.id, ']'].join('');
};


/*
 * PUBSUB FUNCTIONS
 *
 * Adapted from strophe.pubsub.js
 * Copyright 2008, Stanziq  Inc.
 */

PUBSUB_NS = "http://jabber.org/protocol/pubsub";
NS = {
    PUBSUB: PUBSUB_NS,
    PUBSUB_SUBSCRIBE_OPTIONS: PUBSUB_NS + "#subscribe_options",
    PUBSUB_ERRORS: PUBSUB_NS + "#errors",
    PUBSUB_EVENT: PUBSUB_NS + "#event",
    PUBSUB_OWNER: PUBSUB_NS + "#owner",
    PUBSUB_AUTO_CREATE: PUBSUB_NS + "#auto-create",
    PUBSUB_PUBLISH_OPTIONS: PUBSUB_NS + "#publish-options",
    PUBSUB_NODE_CONFIG: PUBSUB_NS + "#node_config",
    PUBSUB_CREATE_AND_CONFIGURE: PUBSUB_NS + "#create-and-configure",
    PUBSUB_SUBSCRIBE_AUTHORIZATION: PUBSUB_NS + "#subscribe_authorization",
    PUBSUB_GET_PENDING: PUBSUB_NS + "#get-pending",
    PUBSUB_MANAGE_SUBSCRIPTIONS: PUBSUB_NS + "#manage-subscriptions",
    PUBSUB_META_DATA: PUBSUB_NS + "#meta-data"
};

XMPP.prototype.createNode = function(jid, service, node, options, callback) {
    var iqid = $.uniqueId("pubsubcreatenode");
    
    var iq = new xmpp.Element('iq', { from: jid, to: service, type: 'set', id: iqid });
    
    var c_options = new xmpp.Element("configure");
    var x = new xmpp.Element("x", { "xmlns": "jabber:x:data" })
        .c("field",{ "var": "FORM_TYPE", "type": "hidden" })
            .c("value")
                .t(NS.PUBSUB+"#node_config");
    
    for (var i in options)
    {
        var val = options[i];
        x.c(val);
    }
    
    if(options.length && options.length !== 0)
    {
        c_options.c(x);
    }
    
    iq.c('pubsub', { xmlns: NS.PUBSUB })
        .c('create', { node: node }).up()
        .cnode(c_options);
    
    this.on('iq:' + iqid, callback);
    
    this.connection.send(iq.tree());
    return iqid;
};


/***Function
    Subscribe to a node in order to receive event items.
    
    Parameters:
    (String) jid - The node owner's jid.
    (String) service - The name of the pubsub service.
    (String) node -  The name of the pubsub node.
    (Array) options -  The configuration options for the  node.
    (Function) callback - Used to determine if node
    creation was sucessful.
    
    Returns:
    Iq id used to send subscription.
*/
XMPP.prototype.subscribe = function(jid,service,node,options, callback) {
    
    var subid = $.uniqueId("subscribenode");
    
    //create subscription options
    var sub_options = new xmpp.Element("options");
    var x = new xmpp.Element("x",{ "xmlns": "jabber:x:data" })
        .c("field",{ "var": "FORM_TYPE", "type": "hidden" })
            .c("value")
                .t(NS.PUBSUB_SUBSCRIBE_OPTIONS);

    var sub = new xmpp.Element('iq', { from: jid, to: service, type: 'set', id: subid });

    if(options && options.length && options.length !== 0)
    {
        for (var i = 0; i < options.length; i++) {
            var val = options[i];
            x.c(val);
        }
        sub_options.c(x);
        
        sub.c('pubsub', { xmlns: NS.PUBSUB })
            .c('subscribe', { node: node, jid: jid }).up()
            .cnode(sub_options);
    } else {
        sub.c('pubsub', { xmlns: NS.PUBSUB }).c('subscribe',
            { node: node, jid: jid });
    }
    
    
    this.on('iq:' + subid, callback);

    this.connection.send(sub.tree());
    return subid;
    
};


/***Function
    Unsubscribe from a node.
    
    Parameters:
    (String) jid - The node owner's jid.
    (String) service - The name of the pubsub service.
    (String) node -  The name of the pubsub node.
    (Function) callback - Used to determine if node
    creation was sucessful.
    
*/    
XMPP.prototype.unsubscribe = function(jid,service,node, callback) {
    
    var subid = $.uniqueId("unsubscribenode");
    
    var sub = new xmpp.Element('iq', { from: jid, to: service, type: 'set', id: subid })
        .c('pubsub', { xmlns: NS.PUBSUB })
            .c('unsubscribe', { node: node, jid: jid });
    
    this.on('iq:' + subid, callback);

    this.connection.send(sub.tree());
    
    return subid;
    
};

/***Function
    
Publish and item to the given pubsub node.

Parameters:
(String) jid - The node owner's jid.
(String) service - The name of the pubsub service.
(String) node -  The name of the pubsub node.
(Array) items -  The list of items to be published.
(Function) callback - Used to determine if node
creation was sucessful.
*/    
XMPP.prototype.publish = function(jid, service, node, items, callback) {
    var pubid = $.uniqueId("publishnode");
    
    var publish_elem = new xmpp.Element("publish", { node: node, jid: jid });

    for (var i in items) {
        publish_elem.c('item')
            .c('entry')
                .t(items[i]);
    }
    
    var pub = new xmpp.Element('iq', { from: jid, to: service, type: 'set', id: pubid })
        .c('pubsub', { xmlns: NS.PUBSUB })
            .cnode(publish_elem);
    
    this.on('iq:' + pubid, callback);
    this.connection.send(pub.tree());
    
    return pubid;
};


/*Function: items
  Used to retrieve the persistent items from the pubsub node.
  
*/
XMPP.prototype.items = function(jid, service, node, ok_callback, error_back) {
    var itemsid = $.uniqueId("pubsubitems");

    //ask for all items
    var pub = new xmpp.Element('iq', { from: jid, to: service, type: 'get', id: itemsid })
        .c('pubsub', { xmlns: NS.PUBSUB })
            .c('items',{ node: node });
    
    this.on('iq:' + itemsid, function(stanza) {
        var iqtype = stanza.attrs.type;

	    if(iqtype == 'result') {
            if (ok_callback) {
                ok_callback(stanza);
            }
	    } else if (iqtype == 'error') {
            if (errback) {
                errback(stanza);
            }
	    } else {
            throw new Error("Got bad IQ type of " + iqtype);
        }
	});

    this.connection.send(pub.tree());
};

// Expose node-xmpp functions for convenience
exports.xmpp = xmpp;
exports.XML = xmpp.XML;
exports.Element = xmpp.Element;
exports.JID = xmpp.JID;

