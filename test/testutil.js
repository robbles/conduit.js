var assert = require('assert');

/* Use to check that a event is emitted, with a error timeout in ms */
this.expectEvent = function(event, timeout, trigger, validator) {
    return {
        topic: function(topic) {
            var self = this;
            var timer = setTimeout(this.callback, timeout, true);
            topic.on(event, function handler() {
                clearTimeout(timer);

                // Avoid issues with unhandled errors
                setTimeout(function() { topic.removeListener(event, handler); }, 0);

                var args = Array.prototype.slice.call(arguments);
                args.unshift(false);
                
                self.callback.apply(self, args);
            });
            if(trigger) {
                trigger(topic);
            }
        },
        '': function(err) {
            assert.isFalse(err, 'Timed out waiting for event "' + event + '"');

            if(typeof validator !== 'undefined') {
                var args = Array.prototype.slice.call(arguments, 1);
                validator.apply(this, args);
            }
        }
    };
};
