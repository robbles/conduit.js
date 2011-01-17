
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

};



