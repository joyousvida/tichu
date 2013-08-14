assert = require 'assert'
EventEmitter = (require 'events').EventEmitter

T = require 'server/typecheck.iced'
util_m = require 'server/util.iced'

tichu_game_m = require 'server/tichu_game/tichu_game.js'
TichuGame = tichu_game_m.TichuGame

poll_server_m = require 'server/poll_server.iced'
PollProvider = poll_server_m.PollProvider
LatestDataProvider = poll_server_m.LatestDataProvider

class TableProvider extends PollProvider
  constructor: (@table) ->
    @_cursor = 0

    @_game_ends = []

  update: (checkpoint = false) ->
    @_cursor++
    if checkpoint
      data = {}
      for i in [0...@table.num_players]
        data[i] = @table.package_state i
      @_game_ends.push [@_cursor, data]

    @emit 'cursor-changed'

  get_cursor: -> @_cursor

  get_data: (cid, since_cursor, cb) ->
    if since_cursor is @_cursor
      return cb null, null, @_cursor

    len = @_game_ends.length
    if len > 0 and @_game_ends[len - 1][0] > since_cursor
      idx = len
      while idx > 0 and @_game_ends[idx - 1][0] > since_cursor
        idx--
      [new_cursor, data] = @_game_ends[idx]
      return cb null, data[cid], new_cursor

    return cb null, (@table.package_state cid), @_cursor


class TichuTable
  constructor: ->
    @poll_provider = new TableProvider @
    @chats = []
    @num_players = 4

    @_scores =
      team02: 0
      team13: 0
    @_teams = ['team02', 'team13', 'team02', 'team13']

    # TODO: should track a game id of some sort

    @game = null
    @_new_game()

  _add_scores: ->
    for player, idx in @game.players
      @_scores[@_teams[idx]] += player.points

  _new_game: ->
    # TODO: clear chats?
    @game = new TichuGame

  get_poll_provider: ->
    return @poll_provider

  add_chat: (mesg) ->
    @chats.push mesg
    @poll_provider.update()

  package_state: (player_id) ->
    assert 0 <= player_id and player_id < @num_players
    ret = @game.get_client_state player_id
    ret.chats = util_m.clone @chats
    ret.scores = util_m.clone @_scores
    return ret

  perform_action: (action) ->
    result = @game.perform_action action
    if result.mesg?
      @chats.push result.mesg

    if @game.is_game_over()
      @poll_provider.update true
      @_add_scores()
      @_new_game()
      @poll_provider.update()

    else
      @poll_provider.update()

    return result


exports.TichuTable = TichuTable
