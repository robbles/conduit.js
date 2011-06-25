conduit = require '../conduit'

conduit.configure
    debug: true
    invincible: true
    cwd: __dirname

# Start XBee script
xbee = new conduit.Script './scripts/xbee_interface.py'
    id: 'xbee'
    restart: 3000
    env:
        PORT: '/dev/tty.usbserial-*'
        LOGGING: 'WARNING'

xbee.on 'message', (message) ->
    frame = JSON.parse(message)
    console.log 'Received an XBee frame of type ' + frame.id.toUpperCase()

    if frame.id == 'rx'
        console.log 'Received: "%s"', frame.rf_data

