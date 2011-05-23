
conduit = require '../conduit'


# Start echo plugin
echo = new conduit.Script 'node'
    id: 1
    args: ['./examples/scripts/echo.js']
    encoding: 'utf8'
    
setInterval (() -> echo.sendMessage 'yo!'), 1000

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
    id: 2
    jid: 'conduit@xabber.de'
    password: 'password'

## Routing messages from XMPP
xmpp.on 'message', (message) ->

    # Send to echo plugin
    echo.sendMessage message.body


