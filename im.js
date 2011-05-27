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
        new xmpp.Element('presence', {from: this.jid})
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


