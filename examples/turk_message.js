var sys = require('sys');
var argv = process.argv;

// Use bundled node-xmpp
//require.paths.push('./lib')
var xmpp = require('node-xmpp');

var cl = new xmpp.Client({ jid: 'turk-apps-1@jabber.iitsp.com',
                           password: 'password' });
cl.addListener('online',
               function() {
                   cl.send(new xmpp.Element('message', { to: 'turk-platform-1@jabber.iitsp.com', type: 'normal'})
                       .c('update', { xmlns:'http://turkinnovations.com/protocol', type:'driver', from:'0', to:'8'})
                           .c('command', { type:argv[2] }));

                   // nodejs has nothing left to do and will exit
                   cl.end();
               });
cl.addListener('error',
               function(e) {
                   sys.puts(e);
                   process.exit(1);
               });
