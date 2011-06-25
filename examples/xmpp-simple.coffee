conduit = require '../conduit'

conduit.configure
    debug: true
    invincible: true
    cwd: __dirname

# Set up XMPP client
xmpp = new conduit.XMPP
    id: 'conduit@doteight'
    jid: 'conduit@doteight.com'
    password: 'password'
    reconnect: 5000

xmpp.on 'online', () ->
    console.log '%s is online!', xmpp

## Routing messages from XMPP
xmpp.on 'message', (message) ->
    console.log 'received a message'

    to = message.attrs.to;
    subject = message.getChild 'subject'
    body = message.getChild 'body'

    console.log 'to: %s, subject: %s, body: %s', to,  subject, body.toString()


