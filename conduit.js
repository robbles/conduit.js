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
    this.id = opt.id || $.uniqueId();
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

var scripts = require('./scripts');
exports.scripts = scripts;
exports.Script = scripts.Script;

exports.tobase64 = scripts.encoder('base64');
exports.frombase64 = scripts.decoder('base64');

var im = require('./im');
exports.im = im;
exports.XMPP = im.XMPP;

