(function() {

/* built-in libraries */
var vm = require('vm'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn;
    util = require('util');

/* external libraries */
var _ = require('./underscore');

var default_config = 'config.js';


/*
 * Child stdin/stdout functionality
 */

var buffer = [];
var linebreak = '\n';

var decode = function(base64) { return new Buffer(base64, 'base64').toString('utf8'); }
var encode = function(utf8) { return new Buffer(utf8, 'utf8').toString('base64'); }

var decode_data = function(encoded) {
    // Decode from base64
    console.log('stdout decoded: "'
    + decode(encoded)
    + '"');
};

var child_stdout = function (data) {
    console.log('stdout: received a ' + typeof data + ' of length ' + data.length);
    console.log(util.inspect(data));

    // Split into chunks and check if last chunk is complete
    var chunks = data.split(linebreak);
    var lastComplete = (data.slice(-linebreak.length) === linebreak);

    // Process multiple chunks before last chunk, if present
    chunks.slice(0, -1).forEach(function(chunk) {
        buffer.push(chunk);
        // We know these are full lines or end of line
        encoded = buffer.join('');
        buffer = [];
        console.log('processing full line "' + encoded + '"');
        decode_data(encoded);
    });

    // Buffer final chunk if not complete
    if(!lastComplete) {
        console.log('buffering partial line "' + chunks.slice(-1) + '"');
        buffer.push(chunks.slice(-1));
    }
};

var child_stderr = function (data) {
    data.split(linebreak).forEach(function(msg) {
        if(msg) {
            console.log('stderr: ' + msg);
        }
    });
};

var child_exited = function (code) {
    console.log('child process exited with code ' + code);
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
        var config = {
            here: path.dirname(config_file),
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
    console.log(util.inspect(config, false, 10));

    _.each(config.plugins, function(pspec) {

        console.log('Setting up child process');
        var child = spawn(pspec.command, pspec.args, pspec.options);
        child.stdin.setEncoding('ascii');
        child.stdout.setEncoding('ascii');
        child.stderr.setEncoding('utf-8');

        child.stdout.on('data', child_stdout);
        child.stderr.on('data', child_stderr);
        child.on('exit', child_exited);

        // Poke at child process
        setInterval(function() {
            console.log('Writing to child...');
            child.stdin.write(encode('testing') + '\n');
        }, 1000);
    });
    
}

if(process.argv[1] == __filename) {
    main(process.argv.slice(2));
}

}).call(this);
