
conduit = require './conduit'

# Set up XMPP client
xmpp = conduit.XMPP
    jid: 'conduit-platform-1@jabber.iitsp.com'
    password: 'password'

# Start echo plugin
echo = conduit.Plugin
    command: 'node'
    args: ['./plugins/echo.js']


# Routing messages from XMPP
xmpp.on 'message', (message) ->

    # Send to echo plugin
    echo.sendMessage message.body

    # OR 

    message -> echo


# Routing output from plugin
echo.on 'message', (message) ->

    # Send to XMPP client
    xmpp.sendMessage message.body, 'conduit-sample-app@jabber.org'

    # Also send to web hook
    conduit.webHook
        method: 'POST'
        url: 'http://doteight.com/conduit/api/?plugin=echo'
        body: message.body


