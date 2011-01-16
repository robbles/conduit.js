
// Add list of plugins to run here
plugins = {
    echo: {
        command: 'node',
        args: [here + '/plugins/echo.js'],
    },
    echo2: {
        command: 'node',
        args: [here + '/plugins/echo.js'],
    },
};

// Add XMPP accounts here
accounts = {
    'turk-platform-1@jabber.iitsp.com': {
        username: 'turk-platform-1',
        password: 'password',
        server: 'jabber.iitsp.com',
        secure: true,
    }
}


