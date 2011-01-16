var util = require('util');

var log = function(msg) {
    util.debug('[echo.js] ' + msg + '\n');
}

var decode = function(base64) { return new Buffer(base64, 'base64').toString('utf8'); }
var encode = function(utf8) { return new Buffer(utf8, 'utf8').toString('base64'); }

var stdin = process.openStdin();
stdin.setEncoding('utf8');

stdin.on('data', function(data) {
    log('received: ' + util.inspect(data));

    var in_msg = decode(data.slice(0, -1));

    log('decoded as ' + in_msg);

    var out_msg = encode(in_msg) + '\n';

    process.stdout.write(out_msg);
});

