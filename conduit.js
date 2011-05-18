/* built-in modules */
var fs = require('fs'),
    sys = require('sys'),
    path = require('path'),
    spawn = require('child_process').spawn,
    EventEmitter = require('events').EventEmitter,
    util = require('util');
    
/* external libraries */
var $ = require('underscore'),
    xmpp = require('node-xmpp');

var linebreak = '\n';

/* Buffer encode/decode helpers */
var decoder = function(encoding) {
    return function(encoded) { 
        return new Buffer(encoded, encoding).toString('utf8'); 
    };
};
var encoder = function(encoding) {
    return function(decoded) { 
        return new Buffer(decoded, 'utf8').toString(encoding); 
    };
};

var Component = function(opt) {
    EventEmitter.call(this);
    opt = opt || {};

    this.checkOptions(opt);

    // Generate id if needed
    this.id = opt.id || this.createUUID();
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
}


/*
 * Handles child process functionality
 */
var Script = function(command, opt) {
    Component.call(this, opt);

    // for storing partial lines from stdout
    this.buffer = [];

    if($.isUndefined(command)) {
        throw new Error('No command specified!');
    }
    this.command = command;

    // options
    opt = opt || {};
    this.args = opt.args || [];
    this.env = opt.env || process.env;
    this.cwd = opt.cwd || __dirname;
    this.encode = encoder(opt.encoding || 'utf-8');
    this.decode = decoder(opt.encoding || 'utf-8');

    this.start();
};

sys.inherits(Script, Component);
Script.prototype.options.push('args', 'env', 'cwd', 'encoding');
exports.Script = Script;

/* 
 * Starts the child process for this plugin
 */
Script.prototype.start = function() {
    var processOptions = { 
        env: this.env,
        cwd: this.cwd,
        customFds: [-1, -1, -1]
    };

    var process = spawn(this.command, this.args, processOptions);
    $([process.stdin, process.stdout, process.stderr]).each(function(stream) {
        stream.setEncoding('utf8');
    });

    process.stdout.on('data', $.bind(this.receiveStdout, this));
    process.stderr.on('data', $.bind(this.receiveStderr, this));
    process.on('exit', $.bind(this.processExit, this));

    this.process = process;
};

/* 
 * Called when a full line has been read and decoded from stdout 
 */
Script.prototype.handleMessage = function(encoded) {
    var message = this.decode(encoded);
    this.emit('message', message);
};

/* 
 * Called when a full line has been read and decoded from stdout 
 */
Script.prototype.sendMessage = function(message) {
    var encoded = this.encode(message);
    this.process.stdin.write(encoded + linebreak);
};

/*
 * Handler for child process stdout 
 */
Script.prototype.receiveStdout = function(data) {
    // Split into chunks and check if last chunk is complete
    var chunks = data.split(linebreak);
    var lastComplete = (data.slice(-linebreak.length) === linebreak);

    // Process multiple chunks before last chunk, if present
    $.each(chunks.slice(0, -1), function(chunk) {
        this.buffer.push(chunk);
        // We know these are full lines or end of line
        var encoded = this.buffer.join('');
        this.buffer = [];
        this.handleMessage(encoded);
    }, this);

    // Buffer final chunk if not complete
    if(!lastComplete) {
        this.buffer.push(chunks.slice(-1));
    }
};

/*
 * Handler for child process stderr
 */
Script.prototype.receiveStderr = function(data) {
    // Split up lines and treat as debug statements
    $.each(data.split(linebreak), function(line) {
        if(line) {
            this.debug('stderr: ' + line);
            this.emit('debug', data);
        }
    }, this);
};

/*
 * Handler for child process exit
 */
Script.prototype.processExit = function(code) {
    this.emit('exit', code);
};

/*
 * Utility function for spitting out debug info
 */
Script.prototype.debug = function(msg) {
    util.debug(['[ Script', this.id, ']', msg].join(' '));
};



/*
 * Manages connection to the XMPP server
 */
var XMPP = function(jid, username, password, server) {
    EventEmitter.call(this);

    // TODO: provide more options for auth with username/server
    this.jid = jid;
    this.username = username | jid.split('@')[0];
    this.password = password | '';
    this.server = server || jid.split('@')[1];

    this.con = new xmpp.Client({jid: jid, password: password});

    // TODO: add presence/subscription shit

    this.con.on('online', $.bind(function() {
        this.con.send(

            // TODO: figure out how to send presence for each resource
            new xmpp.Element('presence', {
                    from: jid
                }).
                c('show').t('chat').up().
                c('status').t("I'M ONLINNNNNNNE")
        );

        this.emit('online', this.con);
        
    }, this));

    this.con.on('stanza', $.bind(function(stanza) {
          if (stanza.is('message') && stanza.attrs.type !== 'error') {
              this.emit('message', stanza);
          }

    }, this));

    this.con.on('error', $.bind(function(error) {
        this.debug("XMPP connection error: " + error);
    }, this));

};

sys.inherits(XMPP, EventEmitter);
exports.XMPP = XMPP;

/*
 * Utility function for spitting out debug info
 */
XMPP.prototype.debug = function(msg) {
    util.debug(['[ XMPP ' + this.jid + ' ]', msg].join(' '));
};



