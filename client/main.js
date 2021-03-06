// Generated by CoffeeScript 1.6.3
(function() {
  var make_table_elt, refresh_table_list, uid;

  uid = null;

  make_table_elt = function(tid, users) {
    var elt, player_id, user, _fn, _i, _len;
    elt = $('<div>');
    elt.append(($('<span>')).text(tid));
    if (users.length !== 4) {
      throw new Error("wrong number of users: " + users);
    }
    _fn = function(user, player_id) {
      var join_button, on_join;
      on_join = function(err, resp) {
        if (err) {
          throw new Error('todo: handle error');
        }
        if (!resp.success) {
          alert('player id ' + player_id + ' is already taken');
          return;
        }
        return window.location.href = '/table/' + tid + '?player_id=' + player_id;
      };
      join_button = $('<button>' + player_id + '</button>');
      if (user != null) {
        join_button.attr('disabled', true);
      } else {
        join_button.click(function() {
          return $ajax('/table/' + tid + '/join', {
            tid: tid,
            uid: uid,
            player_id: player_id
          }, 'post', on_join);
        });
      }
      return elt.append(join_button);
    };
    for (player_id = _i = 0, _len = users.length; _i < _len; player_id = ++_i) {
      user = users[player_id];
      _fn(user, player_id);
    }
    return elt;
  };

  refresh_table_list = function(table_list_info) {
    var container, info, table_elt, _i, _len, _results;
    container = $('#table-list');
    container.empty();
    _results = [];
    for (_i = 0, _len = table_list_info.length; _i < _len; _i++) {
      info = table_list_info[_i];
      table_elt = make_table_elt(info.tid, info.users);
      _results.push(container.append(table_elt));
    }
    return _results;
  };

  window.onload = function() {
    var poll_client;
    uid = $('#user-info').attr('uid');
    poll_client = new LongPollClient(uid, '/table_list/poll');
    poll_client.register_handler('table-list', -1, function(table_list_info) {
      console.log('info', table_list_info);
      return refresh_table_list(table_list_info);
    });
    poll_client.run();
    return $('#create-table-button').click(function() {
      return $ajax('/table_list/create_table', {}, 'post', function(err, resp) {
        if (err) {
          throw new Error('todo: handle create_table error');
        }
      });
    });
  };

}).call(this);
