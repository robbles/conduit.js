/* built-in modules */
var http = require('http'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter,
    conduit = require('./conduit'),
    Component = require('./conduit').Component;
    util = require('util');

/* external libraries */
var $ = require('underscore');

/*
 * A prototype web request that can be repeatedly issued.
 */
var WebHook = function(opt) {
    Component.call(this, opt);

    if(typeof opt.host === 'undefined') {
        throw new Error('host must be provided');
    }
    this.host = opt.host;
    this.port = opt.port || 80;
    this.path = opt.path || '/';
    this.method = opt.method || 'GET';
    this.body = opt.body || '';
    this.defaults = opt.defaults || {};

    // Do template settings here to avoid tampering
    $.templateSettings = {
        interpolate : /\{\{([\s\S]+?)\}\}/g,
        evaluate : /\{%([\s\S]+?)%\}/g
    };
    
    this.path_template = $.template(this.path);
    this.body_template = $.template(this.body);
};

sys.inherits(WebHook, Component);
Component.extendOptions(Component, WebHook, 
    ['host', 'port', 'path', 'method', 'body', 'defaults']);
exports.WebHook = WebHook;


WebHook.prototype.toString = function() {
    return ['[WebHook ', this.id, ']'].join('');
};

WebHook.prototype.request = function(data) {
    var path, body;
    try {
        path = this.path_template(data);
        body = this.body_template(data);
    } catch(err) {
        this.emit('error', err);
    }

    var options = {
        host: this.host,
        port: this.port,
        path: path,
        method: this.method
    };

    var request = http.request(options, function(response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
            // TODO: API for received data?
        });
    });

    request.on('error', function(err) {
        this.emit('error', err);
    });

    request.write(body);

    // finalize the request
    request.end();
};

