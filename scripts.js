var sys = require('sys'),
    spawn = require('child_process').spawn,
    $ = require('underscore'),
    util = require('util'),
    Component = require('./conduit').Component;

/*
 * Handles child process functionality
 */
var Script = function(command, opt) {
    Component.call(this, opt);

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
    this.restart = parseInt(opt.restart, 10) || false;

    this.start();
};

sys.inherits(Script, Component);
Component.extendOptions(Component, Script, 
    ['args', 'env', 'cwd', 'encoding', 'restart']);
exports.Script = Script;

/* 
 * Starts the child process for this plugin
 */
Script.prototype.start = function() {
    // for storing partial lines from stdout
    this.buffer = [];

    var processOptions = { 
        env: this.env,
        cwd: this.cwd,
        customFds: [-1, -1, -1]
    };

    var process = spawn(this.command, this.args, processOptions);
    $([process.stdin, process.stdout, process.stderr]).each(function(stream) {
        stream.setEncoding('utf8');
    });

    process.stdout.on('data', $(this.receiveStdout).bind(this));
    process.stderr.on('data', $(this.receiveStderr).bind(this));
    process.on('exit', $(this.processExit).bind(this));

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

    if(this.restart) {
        // Restart after a short delay
        setTimeout($(this.start).bind(this), this.restart);
    }
};

/*
 * Utility function for spitting out debug info
 */
Script.prototype.debug = function(msg) {
    util.debug([this, ': ',  msg].join(' '));
};

Script.prototype.toString = function() {
    return ['[Script', this.id, ']'].join(' ');
};

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

