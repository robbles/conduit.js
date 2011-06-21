
conduit = require '../conduit'

conduit.configure
    debug: true
    invincible: true
    cwd: __dirname

# Start echo script
echo = new conduit.Script 'node'
    id: 'echo'
    args: ['./scripts/echo.js']
    encoding: 'utf8'
    
# Start clock time controller
clock = new conduit.Script './scripts/clock.py'
    id: 'clock'
    restart: 1000
    env:
        SLEEP_TIME: 10

# Start XBee script
xbee = new conduit.Script './scripts/xbee_interface.py'
    id: 'xbee'
    restart: 3000
    env:
        PORT: '/dev/tty.usbserial-*'
        LOGGING: 'INFO'

# Set clock time
clock.on 'message', (message) ->
    console.log 'Setting clock time with message ' + message

    command = JSON.stringify
        action: 'send'
        address: '\x00\x13\xa2\x00\x40\x52\xda\x9a'
        data: message

    xbee.sendMessage command

xbee.on 'message', (message) ->
    parsed = JSON.parse(message)
    console.log 'Received an XBee frame of type ' + parsed.id.toUpperCase()

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

