conduit = require '../conduit'
Element = conduit.im.XML.Element

conduit.initialize
    debug: true
    invincible: true


# Set up XMPP client
xmpp = new conduit.XMPP
    id: 'admin'
    jid: 'admin@localhost'
    password: 'password'
    reconnect: 5000

service = 'pubsub.macpro.local'
pubsub_node = 'pubsub.demo.v1'

xmpp.on 'online', () ->
    console.log '%s is online!', xmpp
    setInterval setTime, 1000

    xmpp.subscribe xmpp.jid, service, pubsub_node, {}, (response) ->
        if response.attrs.type == 'result'
            console.log 'subscribed!'
        else
            console.error 'failed to subscribe: %s', response.getChild('error')

    xmpp.items xmpp.jid, service, pubsub_node, (
            (response) ->
                console.log 'Got items from pubsub node: ', response.toString()
        ),(
            (error) ->
                console.error 'failed to get items: %s', response.getChild('error')
        )


        

xmpp.on 'message', (message) ->
    console.log 'received a message from "%s"', message.attrs.from


setTime = () ->
    console.log 'setting the time...'

    msg = new Element('data', { type:'msg_text' })
        .t('The current time is ' + new Date().getTime())
        .tree().toString()

    xmpp.publish xmpp.jid, service, pubsub_node, [msg], (response) ->
        console.log('Result from publish: %s', response)




