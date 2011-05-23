var sys = require('sys'),
    util = require('util'),
    xmpp = require('node-xmpp'),
    $ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    Component = require('./conduit').Component;

/*
 * Manages connection to the XMPP server
 */
var XMPP = function(opt) {
    Component.call(this);
    
    if(typeof opt.jid === 'undefined') {
        throw new Error('JID must be provided');
    }
    if(typeof opt.password === 'undefined') {
        throw new Error('password must be provided');
    }

    this.jid = opt.jid;
    this.password = opt.password;

    this.conn = new xmpp.Client(opt);

    this.conn.on('online', $(this.clientOnline).bind(this));
    this.conn.on('stanza', $(this.handleStanza).bind(this));
    this.conn.on('error', $(this.handleError).bind(this));
};

sys.inherits(XMPP, Component);
Component.extendOptions(Component, XMPP, 
    ['jid', 'password', 'port', 'host', 'autoconnect']);
exports.XMPP = XMPP;


XMPP.prototype.clientOnline = function() {
    // Send default presence
    this.conn.send(
        new xmpp.Element('presence', {from: this.jid})
            .c('show').t('chat').up()
            .c('status').t("online")
    );

    this.emit('online', this.conn);
};

XMPP.prototype.handleStanza = function(stanza) {
    this.emit('stanza', stanza);

    if (stanza.is('message') && stanza.attrs.type !== 'error') {
        this.emit('message', stanza);
    }
};

XMPP.prototype.handleError = function(error) {
    // Capture error when no listeners are present
    if(!this.listeners('error').length) {
        this.debug("unhandled error: " + error);
    } else {
        this.emit('error', error);
    }
};

/*
 * Utility function for spitting out debug info
 */
XMPP.prototype.debug = function(msg) {
    util.debug([this, ': ',  msg].join(' '));
};

XMPP.prototype.toString = function() {
    return ['[XMPP', this.jid, ']'].join(' ');
};


