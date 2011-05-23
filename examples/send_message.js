/**
 * Sends an XMPP chat message to another user. 
 * Uses the node-xmpp library from
 * https://github.com/astro/node-xmpp or available from npm as "node-xmpp".
 *
 */

var xmpp = require('node-xmpp');

// Credentials for the XMPP account to send from
var jid = 'example_sender@jabber.org';
var password = 'password';

// Message to send
var to = "example_receiver@jabber.org";
var body = "Hello!";

// Constructs a message stanza and sends using the given XMPP client
var sendMessage = function(client, to, body) {
    var msg = new xmpp.Element('message', {
        to: to, 
        type: 'chat'
    }).c('body').t(body);

    client.send(msg);
};

// Create an XMPP client
var client = new xmpp.Client({ jid: jid, password: password });

// Send message once connection is established
client.addListener('online', function() {
    sendMessage(client, to, body);

    // Shut down client after sending message
    client.end();
});

// Error handling
client.addListener('error', function(e) {
    console.error('Error sending message: ' + e);
    process.exit(1);
});

