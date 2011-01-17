/* built-in modules */
var fs = require('fs'),
    sys = require('sys'),
    path = require('path'),
    spawn = require('child_process').spawn,
    EventEmitter = require('events').EventEmitter,
    util = require('util');
    

/* work-around for missing vm module */
try {
    var vm = require('vm');
} catch(err) {
    console.log('warning: using unofficial vm module');
    var vm = process.binding('evals').Script;
}

/* external libraries */
var _ = require('./underscore');
//require.paths.push(path.join(__dirname, 'lib'));
var xmpp = require('node-xmpp');

var default_config = 'config.js';
var linebreak = '\n';

/* Base64 encode/decode */
var decode = function(base64) { return new Buffer(base64, 'base64').toString('utf8'); }
var encode = function(utf8) { return new Buffer(utf8, 'utf8').toString('base64'); }

/*
 * Handles child process functionality
 */
var Plugin = function(id, command, args, env, cwd) {
    EventEmitter.call(this);

    // for storing partial lines from stdout
    this.buffer = [];

    // Used as unique ref for this plugin
    this.id = id;

    if(_.isNull(command)) {
        throw new Error('No command specified!');
    }
    this.command = command;

    // Not required
    this.args = args || [];
    this.env = env || process.env;
    this.cwd = cwd;
};

sys.inherits(Plugin, EventEmitter);
exports.Plugin = Plugin;

/* 
 * Starts the child process for this plugin
 */
Plugin.prototype.start = function() {
    var processOptions = { 
        env: this.env,
        cwd: this.cwd,
        customFds: [-1, -1, -1],
    };

    var process = spawn(this.command, this.args, processOptions);
    process.stdin.setEncoding('utf8');
    process.stdout.setEncoding('utf8');
    process.stderr.setEncoding('utf8');

    process.stdout.on('data', _.bind(this.receiveStdout, this));
    process.stderr.on('data', _.bind(this.receiveStderr, this));
    process.on('exit', _.bind(this.processExit, this));

    this.process = process;
    this.emit('started', process);
};

/* 
 * Called when a full line has been read and decoded from stdout 
 */
Plugin.prototype.handleMessage = function(encoded) {
    var message = decode(encoded);
    this.debug('Received a message: ' + message);
    this.emit('message', message);
};

/* 
 * Called when a full line has been read and decoded from stdout 
 */
Plugin.prototype.sendMessage = function(message) {
    this.debug('Sending a message: ' + message);
    var encoded = encode(message);
    this.process.stdin.write(encoded + linebreak);
};

/*
 * Handler for child process stdout 
 */
Plugin.prototype.receiveStdout = function(data) {
    this.debug('stdout: received a ' + typeof data + ' of length ' + data.length);
    this.debug(util.inspect(data));

    // Split into chunks and check if last chunk is complete
    var chunks = data.split(linebreak);
    var lastComplete = (data.slice(-linebreak.length) === linebreak);

    // Process multiple chunks before last chunk, if present
    _.each(chunks.slice(0, -1), function(chunk) {
        this.buffer.push(chunk);
        // We know these are full lines or end of line
        var encoded = this.buffer.join('');
        this.buffer = [];
        this.debug('processing full line "' + encoded + '"');
        this.handleMessage(encoded);
    }, this);

    // Buffer final chunk if not complete
    if(!lastComplete) {
        this.debug('this.buffering partial line "' + chunks.slice(-1) + '"');
        this.buffer.push(chunks.slice(-1));
    }
};

/*
 * Handler for child process stderr
 */
Plugin.prototype.receiveStderr = function(data) {
    // Split up lines and treat as debug statements
    _.each(data.split(linebreak), function(line) {
        if(line) {
            this.debug('stderr: ' + line);
        }
    }, this);
    this.emit('debug', data);
};

/*
 * Handler for child process exit
 */
Plugin.prototype.processExit = function(code) {
    this.debug('child process exited with code ' + code);
    this.emit('exit', code);
};

/*
 * Utility function for spitting out debug info
 */
Plugin.prototype.debug = function(msg) {
    util.debug(['[ Plugin', this.id, ']', msg].join(' '));
};



/*
 * Manages connection to the XMPP server
 */
var XMPPConnection = function(jid, username, password, server) {
    EventEmitter.call(this);
    
    // TODO: provide more options for auth with username/server
    this.jid = jid;
    this.username = username | jid.split('@')[0];
    this.password = password | '';
    this.server = server || jid.split('@')[1];

    this.con = new xmpp.Client({jid: jid, password: password});

    // TODO: add presence/subscription shit

    this.con.on('online', _.bind(function() {
        this.debug("yeahhhhh we're online, baby!");

        this.con.send(
            new xmpp.Element('presence', { type: 'chat'}).
                c('show').t('chat').up().
                c('status').t('Send me yo messages, foos')
        );

        this.emit('online', this.con);
        
    }, this));

    this.con.on('stanza', _.bind(function(stanza) {
        this.debug("we received some shit: " + stanza);

          if (stanza.is('message') && stanza.attrs.type !== 'error') {
              this.emit('message', stanza.getChildText('body'));
          }

    }, this));

    this.con.on('error', _.bind(function(error) {
        this.debug("its all going sideways: " + error);
    }, this));
};

sys.inherits(XMPPConnection, EventEmitter);
exports.XMPPConnection = XMPPConnection;

/*
 * Utility function for spitting out debug info
 */
XMPPConnection.prototype.debug = function(msg) {
    util.debug(['[ XMPP ]', msg].join(' '));
};


/*
 * Routes messages between connections (XMPP) and plugins (process
 * stdin/stdout)
 */
var Router = function(connections, plugins, rules) {
    var self = this;
    this.connections = connections;
    this.plugins = plugins;
    this.rules = rules;

    _.each(connections, function(con) {
        con.on('message', function(message) {
            self.debug('new message from connection: ' + message);
        });
    });

    _.each(plugins, function(plugin) {
        plugin.on('message', function(message) {
            self.debug('new message from plugin: ' + message);
        });
    });
};

/*
 * Utility function for spitting out debug info
 */
Router.prototype.debug = function(msg) {
    util.debug(['[ Router ]', msg].join(' '));
};



/*
 * Command-line running
 */

var usage = function() {
    console.error('usage: node conduit.js [-f config.js]');
    process.exit(1);
};

var main = function(argv) {
    var config_file = path.join('./', default_config);

    if (argv.length) {
        if(argv[0] === '-f' && argv.length == 2) {
            config_file = argv[1];
            console.log('using config file: "' + config + '"');
        } else {
            usage();
            process.exit(1);
        }
    }

    try {
        var code = fs.readFileSync(config_file, 'utf8');
    } catch(err) {
        console.error('Error opening config file: ' + err);
        process.exit(1);
    }

    try {
        var configDir = path.dirname(config_file);
        var config = {
            here: configDir,
            plugins: {},
            global: {},
            accounts: {},
            streams: {},
        };
        vm.runInNewContext(code, config, config_file);
    } catch(err) {
        console.error('Error parsing config file: ' + err);
        process.exit(1);
    }

    console.log('Config file ' + path.basename(config_file) + ' loaded!');

    var connections = {};
    var plugins = {};

    // Setup XMPP accounts
    _.each(config.accounts, function(account, id) {
        connections[id] = new XMPPConnection(account.jid, account.username, account.password, account.server);
    });

    // Start plugins
    _.each(config.plugins, function(pspec, id) {

        console.log('Setting up child process');

        var plugin = new Plugin(id, pspec.command, pspec.args, pspec.env, configDir);
        plugins[id] = plugin;
        plugin.start();
        
        // Poke at child process
        setTimeout(function() {
            console.log('Writing to child...');
            plugin.sendMessage('hello');
        }, 1000);
    });

    var router = new Router(connections, plugins, config.rules);
    
}

if(process.argv[1] == __filename) {
    main(process.argv.slice(2));
}

