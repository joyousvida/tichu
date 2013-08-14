assert = require 'assert'
http = require 'http'
path = require 'path'
url = require 'url'
EventEmitter = (require 'events').EventEmitter

express = require 'express'
mysql = require 'mysql'

T = require './typecheck.iced'
templates_m = require './templates.iced'

tichu_table_m = require './tichu_game/tichu_table.iced'
TichuTable = tichu_table_m.TichuTable
table_server_m = require './table_server.iced'
TableServer = table_server_m.TableServer

poll_server_m = require './poll_server.iced'
PollServer = poll_server_m.PollServer
LatestDataProvider = poll_server_m.LatestDataProvider

user_m = require './user.iced'
UserStore = user_m.UserStore
User = user_m.User

g_user_store = null#new UserStore
g_poll_server = new PollServer
g_table_router = null

class TableRouter extends EventEmitter
  constructor: (@poll_server, @user_store) ->
    @_table_server_map = {}
    @_next_tid = 0

    @poll_server.register_provider 'table-list', @
    @_cursor = 0

  # impl PollServer
  get_cursor: -> @_cursor

  # impl PollServer
  get_data: (cid, since_cursor, cb) ->
    if @_cursor is since_cursor
      return cb null, null, @_cursor
    return cb null, @list_tables(), @_cursor

  _update: ->
    @_cursor++
    # TODO: do incremental updates
    @emit 'cursor-changed'

  list_tables: ->
    ret = []
    for tid, table_server of @_table_server_map
      ret.push {
        tid: tid
        users: table_server.users.slice()
      }
    return ret

  add_new_table: ->
    tid = 't' + (@_next_tid++)
    table_server = new TableServer tid, (new TichuTable), @poll_server, @user_store
    table_server.on 'players-changed', =>
      @_update()
    @_table_server_map[tid] = table_server
    @_update()
    return tid

  delete_table: (tid) ->
    @_table_server_map.removeAllListeners()
    delete @_table_server_map[tid]
    @_update()

  get_table: (tid) ->
    return @_table_server_map[tid]



init_stores = (cb) ->
  # TODO: real secret
  conn = mysql.createConnection {
    host: 'localhost'
    user: ''
    password: ''
    database: 'tichu'
  }
  conn.connect() # TODO: handle errors
  g_user_store = new UserStore conn
  g_table_router = new TableRouter g_poll_server, g_user_store

  g_user_store.init (err) ->
    return cb err if err
    g_table_router.add_new_table() # make tid 't0'
    return cb null


start_app = ->
  app = express()

  # TODO: use real secret
  app.use(express.cookieParser())
  app.use(express.session({secret: 'abc123'}))

  # serve static files
  app.use(express.static(path.join(__dirname, '..', 'static')))
  app.use(express.bodyParser())

  app.get '/', (request, response) ->
    console.log("=====================")

    render_template = templates_m.render_template
    uid = request.session.uid
    if uid?
      tmpl_params =
        uid: uid
        #tables: g_table_router.list_tables()

      render_template 'main.mustache', tmpl_params, {},
        (err, rendered_tmpl) ->
          if (err)
            return response.send('error: ugly mustaches')
          return response.send(rendered_tmpl)
    else
      render_template 'login.mustache', {}, {},
        (err, rendered_tmpl) ->
          if (err)
            return response.send('error: ugly mustaches')
          return response.send(rendered_tmpl)

  app.all '/logout', (request, response) ->
    delete request.session.uid
    return response.redirect('/')

  app.post '/login', (request, response) ->
    post = request.body

    username = post.username
    password_hash = UserStore.hash_password(post.password)
    user = null

    if post.signup
      if not UserStore.is_valid_username(username)
        return response.send("The username is invalid.")

      g_user_store.make_user username, password_hash, post.info, (err, user) =>
        return response.send(err) if err
        request.session.uid = user.uid
        return response.send({success: true})

    else
      g_user_store.authorize username, password_hash, (err, user) =>
        return response.send(err) if err
        return response.send("Login failed.") unless user?

        request.session.uid = user.uid
        return response.send({success: true})

  app.post '/table_list/create_table', (request, response) ->
    # TODO: allow guests?
    created_tid = g_table_router.add_new_table()
    response.send({tid: created_tid});

  app.post '/table_list/poll', (request, response) ->
    validation_result = T.validate_request request, {
      body:
        cursors: 'object'
    }
    if validation_result?
      return response.status(400).send(validation_result)

    cursors = request.body.cursors
    POLL_DELAY = 20 * 1000
    g_poll_server.longpoll null, cursors, POLL_DELAY, (table_list) ->
      return response.send(table_list)


  app.get '/table/:tid', (request, response) ->
    # TODO: allow guests to observe somehow
    uid = request.session.uid
    if not uid?
      return response.send('You must be logged in to see a table')

    console.log request.query

    validation_result = T.validate_request request, {
      query:
        player_id: 'string' # TODO: figure out how to directly pass this as a number
      params:
        tid: 'string'
      }
    if validation_result?
      return response.status(400).send(validation_result)

    tid = request.params.tid
    player_id = parseInt request.query.player_id
    (g_table_router.get_table tid).handle_root(uid, player_id, response)

  app.post '/table/:tid/join', (request, response) ->
    validation_result = T.validate_request request, {
      params:
        tid: 'string'
      body:
        uid: 'string'
        player_id: 'number'
      }
    if validation_result?
      return response.status(400).send(validation_result)

    tid = request.params.tid
    uid = request.body.uid
    player_id = request.body.player_id

    table_server = (g_table_router.get_table tid)
    if not table_server?
      return response.status(400).send("no such table")

    table_server.handle_join(uid, player_id, response)

  app.post '/table/:tid/kick', (request, response) ->
    validation_result = T.validate_request request, {
      params:
        tid: 'string'
      body:
        player_id: 'number'
      session:
        uid: 'string'
      }
    if validation_result?
      return response.status(400).send(validation_result)

    tid = request.params.tid
    remover_uid = request.session.uid
    player_id = request.body.player_id

    table_server = (g_table_router.get_table tid)
    if not table_server?
      return response.status(400).send("no such table")
    table_server.handle_kick(remover_uid, player_id, response)

  app.post '/table/:tid/poll', (request, response) ->
    #console.log("=====================")
    #console.log("poll")
    uid = request.session.uid
    if not uid?
      return response.status(400).send("You must be logged in.")

    validation_result = T.validate_request request, {
      params:
        tid: 'string'
      body:
        cursors: 'object'
        #player_id: 'number'
    }
    if validation_result?
      return response.status(400).send(validation_result)

    tid = request.params.tid
    player_id = request.body.cid # TODO: validate number or object
    cursors = request.body.cursors

    table_server = (g_table_router.get_table tid)
    if not table_server?
      return response.status(400).send("no such table")

    if not table_server.authorize(uid, player_id)
      return response.send("uid " + uid + " does not match player_id " + player_id)

    POLL_DELAY = 20 * 1000
    g_poll_server.longpoll player_id, cursors, POLL_DELAY, (info) ->
      return response.send(info)

  app.post '/table/:tid/chat', (request, response) ->
    validation_result = T.validate_request request, {
      params:
        tid: 'string'
      body:
        player_chat: 'string'
        player_id: 'number'
    }
    if validation_result?
      return response.status(400).send(validation_result)

    tid = request.params.tid
    table_server = (g_table_router.get_table tid)
    if not table_server?
      return response.status(400).send("no such table")

    player_chat = request.body.player_chat
    player_id = request.body.player_id
    table_server.handle_chat(player_chat, player_id, response)

  app.post '/table/:tid/action', (request, response) ->
    console.log("=====================")
    validation_result = T.validate_request request, {
      params:
        tid: 'string'
      body:
        action: 'object'
        player_id: 'number'
    }
    if validation_result?
      return response.status(400).send(validation_result)
    # TODO: validate action a lot more

    tid = request.params.tid
    action = request.body.action
    player_id = request.body.player_id

    # TODO: validate (uid, player_id) pair
    table_server = (g_table_router.get_table tid)
    if not table_server?
      return response.status(400).send("no such table")

    table_server.handle_action(player_id, action, response)

  app.listen(8888)
  console.log("Server has started.")


exports.start = ->
  init_stores (err) =>
    throw err if err
    start_app()