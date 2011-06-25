#!/usr/bin/env node
console.error('process started');
console.error('current directory is ' + process.cwd());

var stdin = process.openStdin();

stdin.on('data', function(data) {
    console.error('received: ' + data);

    process.stdout.write(data);
});

console.log('simple process started');

