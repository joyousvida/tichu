EventEmitter = (require 'events').EventEmitter
util = require './util.iced'

# TODO: might want to refactor these

class PollProvider extends EventEmitter
  # event: cursor-change
  constructor: ->
    throw new Error "abstract"

  # gets the current cursor
  get_cursor: ->
    throw new Error "abstract"

  # gets data since a cursor, null if no data
  # cb err, cursor?, next_cursor
  get_data: (cid, since_cursor, cb) ->
    throw new Error "abstract"


class LatestDataProvider extends PollProvider
  constructor: (@_package_fn) ->
    @_cursor = 0

  get_cursor: ->
    return @_cursor

  get_data: (cid, since_cursor, cb) ->
    if @_cursor is since_cursor
      return cb null, null, @_cursor

    @_package_fn cid, (err, packaged) =>
      return cb err if err
      return cb null, packaged, @_cursor

  update: ->
    @_cursor++
    @emit 'cursor-changed'


class PubChannel
  constructor: ->
    @_subs = {}
    @_next_subid = 0

  notify: (args...) ->
    to_run = []
    for subid, handler of @_subs
      to_run.push handler

    @_subs = {}
    for handler in to_run
      handler args...

  subscribe_once: (handler) ->
    subid = @_next_subid++
    @_subs[subid] = handler
    return subid

  unsubscribe: (subid) ->
    delete @_subs[subid]


class PollServer
  constructor: ->
    @_channel_info = {}

  # TODO: implement mechanism for removing providers
  register_provider: (channel, provider) ->
    if channel of @_channel_info
      throw new Error "channel #{channel} already has a provider!"
    @_channel_info[channel] =
      provider: provider
      pub: new PubChannel
    provider.on 'cursor-changed', =>
      @_channel_info[channel].pub.notify()

  # TODO: cid should be on a per-cursor basis
  longpoll: (cid, channel_cursor_map, timeout_ms, handler) ->
    console.log 'longpolling on', channel_cursor_map

    gather_data = (channels, cb) =>
      # TODO: refactor this
      got_err = false
      err_map = {}
      channel_data_map = {}

      ct = channels.length
      for channel in channels
        provider = @_channel_info[channel].provider
        channel_data_map[channel] = data_container = {}
        cursor = channel_cursor_map[channel]
        do (channel, data_container, provider, cursor) =>
          provider.get_data cid, cursor, (err, data, next_cursor) =>
            ct -= 1

            if err
              got_err = true
              err_map[channel] = err
            else
              data_container.data = data
              data_container.next_cursor = next_cursor

            if ct == 0
              return cb err_map if got_err
              return cb null, channel_data_map

    return_data = (channels) =>
      gather_data channels, (err, ret) =>
        throw err if err # TODO: pass along error
        return handler ret

    return_immediately = false
    ret_channels = []

    for channel, cursor of channel_cursor_map
      unless channel of @_channel_info
        throw new Error "subscribing to non-existent channel #{channel}"

    for channel, cursor of channel_cursor_map
      provider = @_channel_info[channel].provider
      pub = @_channel_info[channel].pub

      if cursor isnt provider.get_cursor()
        ret_channels.push channel
        return_immediately = true

    if return_immediately
      return return_data ret_channels

    subids = {}
    timeout_id = null

    on_timeout = =>
      for channel, subid of subids
        @_channel_info[channel].pub.unsubscribe subid
      return handler {}
    timeout_id = setTimeout on_timeout, timeout_ms

    for channel, cursor of channel_cursor_map
      provider = @_channel_info[channel].provider
      pub = @_channel_info[channel].pub

      do (channel, cursor, provider, pub) =>
        subids[channel] = pub.subscribe_once =>
          clearTimeout timeout_id
          for c, subid of subids
            continue if c == channel
            @_channel_info[c].pub.unsubscribe subid

          return return_data [channel]


exports.PollServer = PollServer
exports.PollProvider = PollProvider
exports.LatestDataProvider = LatestDataProvider
