
var LongPollClient = function(cid, endpoint) {
    this.cid = cid;
    this.endpoint = endpoint;
    this.cursors = {};
    this.handlers = {};
};

LongPollClient.prototype.register_handler = function(channel, cursor, handler) {
    this.cursors[channel] = cursor;
    this.handlers[channel] = handler;
};

LongPollClient.prototype.await_changes = function(cb) {
    var data = {
        cursors: {},
        cid: this.cid
    };
    for (var channel in this.cursors) {
        data.cursors[channel] = this.cursors[channel];
    }

    function on_success(res) {
        cb(null, res);
    }
    function on_error(res) {
        // TODO: pass along error
        cb(new Error("poll error"));
    }

    $.ajax({
        url: this.endpoint,
        type: "post",
        contentType: "application/json",
        data: JSON.stringify(data),
        success: on_success,
        error: on_error
    });
};

LongPollClient.prototype.run = function() {
    var _this = this;
    function do_one_poll() {
        _this.await_changes(function(error, res) {
            if (error) // TODO
                throw new Error("longpoll error not handled yet");

            for (var channel in res) {
                var info = res[channel];
                if (info.next_cursor == null)
                    throw new Error("got invalid next_cursor!", info);
                _this.cursors[channel] = info.next_cursor;
                _this.handlers[channel](info.data);
            }

            do_one_poll();
        });
    }
    do_one_poll();
};