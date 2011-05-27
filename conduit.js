/* built-in modules */
var fs = require('fs'),
    sys = require('sys'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    util = require('util');
    
/* external libraries */
var $ = require('underscore');

/**
 * Singleton object for options and top-level event handling
 */
var _conduit = {
    debug: false
};

exports.initialize = function(opt) {
    if(typeof opt.error === 'function') {
        process.on('uncaughtException', error);
    }
    if(opt.invincible === true) {
        process.on('uncaughtException', exports.handleError);
    }

    _conduit.debug = $(opt.debug).isUndefined()? _conduit.debug : opt.debug;

    return _conduit;
};

/**
 * Default top-level error handler
 */
exports.handleError = function(err) {
    console.error(err.stack);
};


/**
 * Base class for all unique, event-driven components (Script, XMPP, etc.)
 */
var Component = function(opt) {

    // Throw error when new keyword is not used
    if (!(this instanceof Component))
        throw new TypeError('Must be created with the "new" keyword');
    
    EventEmitter.call(this);
    opt = opt || {};

    this.checkOptions(opt);

    // Generate id if needed
    this.id = opt.id || this.createUUID();
    delete opt.id;
};

sys.inherits(Component, EventEmitter);
Component.prototype.options = ['id'];
exports.Component = Component;

Component.prototype.checkOptions = function(opt) {
    for(var option in opt) {
        if(!$(this.options).include(option)) {
            throw new Error('Invalid option: ' + option);
        }
    }
};

/*
 * Taken from RaphaelJS.
 * Copyright (c) 2010 Dmitry Baranovskiy (http://raphaeljs.com)
 */
Component.prototype.createUUID = function() {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [],
        i = 0;
    for (; i < 32; i++) {
        s[i] = (~~(Math.random() * 16)).toString(16);
    }
    s[12] = 4;  // bits 12-15 of the time_hi_and_version field to 0010
    s[16] = ((s[16] & 3) | 8).toString(16);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    return "i-" + s.join("");
};

Component.extendOptions = function(base, cls, opt) {
    cls.prototype.options = base.prototype.options.slice();
    [].push.apply(cls.prototype.options, opt);
};

exports.objectSlice = function(object, keys) {
    var sliced = {};
    $(keys).each(function(key) {
        sliced[key] = object[key];
    });
    return sliced;
}

exports.Script = require('./scripts').Script;
exports.XMPP = require('./im').XMPP;

