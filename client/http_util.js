function assert(statement, mesg) {
    if (!statement) {
        if (mesg)
            throw new Error("Assertion error: " + mesg);
        else
            throw new Error("Assertion error");
    }
}

function $ajax(endpoint, data, req_type, cb) {
    assert(req_type == 'get' || req_type == 'post');

    function on_success(res) {
        cb(null, res);
    }
    function on_error(res) {
        // TODO: pass along error
        cb(new Error("ajax error"));
    }

    $.ajax({
        url: endpoint,
        type: req_type,
        contentType: "application/json",
        data: JSON.stringify(data),
        success: on_success,
        error: on_error
    });
}
