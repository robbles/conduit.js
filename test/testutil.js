var assert = require('assert');

/* Use to check if a signal is called, with a error timeout in ms */
this.expectEvent = function(signal, timeout, trigger) {
    return {
        topic: function(topic) {
            var self = this;
            var timer = setTimeout(this.callback, timeout, true);
            topic.on(signal, function() {
                clearTimeout(timer);
                self.callback(false);
            });
            if(trigger) {
                trigger(topic);
            }
        },
        '': function(err) {
            assert.isFalse(err, 'Timed out waiting for event "' + signal + '"');
        }
    };
};
