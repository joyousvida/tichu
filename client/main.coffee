uid = null

make_table_elt = (tid, users) ->
  elt = $ '<div>'
  elt.append ($ '<span>').text(tid)

  if users.length isnt 4
    throw new Error "wrong number of users: #{users}"

  for user, player_id in users
    do (user, player_id) ->
      on_join = (err, resp) ->
        if err
          throw new Error 'todo: handle error'
        if not resp.success
          alert('player id ' + player_id + ' is already taken')
          return
        window.location.href = '/table/' + tid + '?player_id=' + player_id
      join_button = $('<button>' + player_id + '</button>')

      if user?
        join_button.attr 'disabled', true
      else
        join_button.click ->
          $ajax '/table/' + tid + '/join',
                {tid: tid, uid: uid, player_id: player_id},
                'post', on_join
      elt.append join_button

  return elt


refresh_table_list = (table_list_info) ->
  container = $ '#table-list'
  container.empty()

  for info in table_list_info
    table_elt = make_table_elt info.tid, info.users
    container.append table_elt


window.onload = ->
  uid = $('#user-info').attr('uid')
  # $('.join-table-container').each ->
  #   make_table_elt($(this), $(this).attr('id'))

  poll_client = new LongPollClient uid, '/table_list/poll'
  poll_client.register_handler 'table-list', -1, (table_list_info) ->
    console.log 'info', table_list_info
    refresh_table_list table_list_info
  poll_client.run()

  $('#create-table-button').click ->
    $ajax '/table_list/create_table', {}, 'post', (err, resp) ->
      if err
        throw new Error 'todo: handle create_table error'
