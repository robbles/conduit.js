
// Add list of plugins to run here
plugins = {
    echo: {
        command: 'node',
        args: [here + '/plugins/echo.js'],
    },
};

// Add XMPP accounts here
accounts = {
    'turk-platform-1': {
        jid: 'turk-platform-1@jabber.iitsp.com',
        password: 'password',
        server: 'jabber.iitsp.com',
    }
}

routing = {
    default: 'allow',

    allow: [
        {
            to: 'turk-platform-1',
            from: 'odwyerrob@gmail.com',
            type: 'chat',
        },
        {
            to: 'turk-platform-1',
            from: 'turk-apps-1@jabber.iitsp.com',
            type: 'normal',
        }
    ],

    deny: [

    ],

    message: [
        {
            plugin: 'echo',
            jid: 'turk-apps-1@jabber.iitsp.com',
        }
    ],

    webhook: [
        {
            plugin: 'echo',
            url: 'http://doteight.com/testapp/',
            method: 'POST'
        }
    ],
};



