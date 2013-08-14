assert = require 'assert'
EventEmitter = (require 'events').EventEmitter

T = require './typecheck.iced'
templates_m = require './templates.iced'
util_m = require './util.js'

poll_server_m = require './poll_server.iced'
PollProvider = poll_server_m.PollProvider
LatestDataProvider = poll_server_m.LatestDataProvider

User = (require './user.iced').User

# event: players-changed
class TableServer extends EventEmitter
  constructor: (@tid, @table, @poll_server, @user_store) ->
    @users = []
    for i in [0...@table.num_players]
      @users.push null
    @owner_queue = []

    @users_provider = new LatestDataProvider (cid, cb) =>
      return cb null, {
        users: ((if user? then (User.dump_json user) else null) for user in @users)
        owner: @_owner()
        }

    poll_server.register_provider (tid + ':table'), @table.get_poll_provider()
    poll_server.register_provider (tid + ':users'), @users_provider

  _is_valid: (player_id) ->
    return (0 <= player_id < @users.length)

  _owner: ->
    if @owner_queue.length == 0
      return null
    return @_uid_for_player_id @owner_queue[0]

  _uid_for_player_id: (player_id) ->
    assert (@_is_valid player_id)
    if not @users[player_id]?
      return null
    return @users[player_id].uid

  _register_player: (user, player_id) ->
    assert (@_is_valid player_id), "Invalid player id! #{player_id}"
    assert not @users[player_id]?
    @users[player_id] = user
    @owner_queue.push player_id
    @users_provider.update()
    @emit 'players-changed'

  _remove_player: (remove_uid, player_id) ->
    assert (@_is_valid player_id)
    player_uid = @users[player_id].uid
    if (remove_uid isnt player_uid and remove_uid isnt @_owner())
      return false

    for pid, idx in @owner_queue
      if pid is player_id
        @owner_queue.splice idx, 1
        break

    @users[player_id] = null
    @users_provider.update()
    @emit 'players-changed'
    return true

  authorize: (uid, player_id) ->
    return (@_uid_for_player_id player_id) == uid

  handle_root: (uid, player_id, response) ->
    if (@_uid_for_player_id player_id) isnt uid
      return response.status(400).send('You are not at this table')

    js_params = JSON.stringify {
      tid: @tid
      player_id: player_id
      uid: uid
      is_owner: (@_owner() == uid)
    }
    templates_m.render_template 'index.mustache',
      {player_id: player_id, js_params: js_params}, {},
      (err, rendered_tmpl) ->
        return response.send('error: ugly mustaches') if err
        return response.send(rendered_tmpl)

  handle_join: (uid, player_id, response) ->
    existing_uid = @_uid_for_player_id player_id
    if existing_uid?
      # already have that player id
      return response.send {success: (existing_uid == uid)}

    @user_store.get_user uid, (err, user) =>
      if not user?
        # user doesn't exist
        return response.send {success: false}
      @_register_player user, player_id
      return response.send {success: true}

  handle_kick: (remover_uid, player_id, response) ->
    result = @_remove_player remover_uid, player_id
    if not result
      return response.send("User " + remover_uid + " can't kick player " + player_id)
    return response.send "ok"

  handle_chat: (player_chat, player_id, response) ->
    console.log "====================="
    console.log "chat"
    if player_chat.length > 0
      @table.add_chat (player_id + ": " + player_chat)
    response.send "ok"

  handle_action: (player_id, action, response) ->
    # TODO: should we pass the player_id separately or via the action?
    # are there actions that don't need a player_id?
    action.player_id = player_id
    console.log "action", action

    result = @table.perform_action action
    console.log "result:", result
    response.send (if result.outcome then "ok" else "failed")


exports.TableServer = TableServer