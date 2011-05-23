var util = require('util');

var decode = function(base64) { return new Buffer(base64, 'base64').toString('utf8'); };
var encode = function(utf8) { return new Buffer(utf8, 'utf8').toString('base64'); };

console.error('process started');
console.error('current directory is ' + process.cwd());

var stdin = process.openStdin();
stdin.setEncoding('utf8');

stdin.on('data', function(data) {
    console.error('received: ' + data);

    var in_msg = decode(data.slice(0, -1));
    console.error('decoded as ' + in_msg);

    console.log(encode(in_msg));
});

console.log(encode("multi-line\nscript\nstarted"));

