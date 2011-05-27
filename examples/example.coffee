
conduit = require '../conduit'

conduit.initialize
    debug: true
    invincible: true

# Start echo plugin
echo = new conduit.Script 'node'
    id: 'echo'
    args: ['./examples/scripts/echo.js']
    encoding: 'utf8'
    
#setInterval (() -> echo.sendMessage 'yo!'), 1000

# Routing output from plugin
echo.on 'message', (message) ->

    console.log 'got a message: ' + message
    # Send to XMPP client
    #xmpp.sendMessage message.body, 'conduit-sample-app@jabber.org'

    # Also send to web hook
    #conduit.webHook
        #method: 'POST'
        #url: 'http://doteight.com/conduit/api/?plugin=echo'
        #body: message.body


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

    subject = message.getChild 'subject'
    body = message.getChild 'body'

    return if not subject or not body

    # Send to echo plugin
    if subject.getText() is 'echo'
        echo.sendMessage body.getText()

    xmpp.connection.send('fail')

