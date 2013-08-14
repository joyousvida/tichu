crypto = require 'crypto'

sha256_hash = (s) ->
  shasum = crypto.createHash 'sha256'
  shasum.update s
  return shasum.digest 'base64'

class User
  @load_row = (row) ->
    uid = 'u' + row.id
    return new User uid, row.username, row.first_name, row.last_name

  @dump_json = (user) ->
    return {
      uid: user.uid,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name
    }

  constructor: (@uid, @username, @first_name, @last_name) ->

  toString: ->
    return JSON.stringify (User.dump_json @)

class UserStore
  @is_valid_username = (username) ->
    return (username.length > 0 and username.length <= 20)

  @hash_password = (password) ->
    return sha256_hash password

  constructor: (@_conn) ->
    # TODO: do we ever need to end the connection, or just hold it open indefinitely?

  init: (cb) ->
    COLUMNS = [
      ['id', 'INT(12) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY']
      ['username', 'VARCHAR(64) NOT NULL UNIQUE KEY']
      ['password', 'VARCHAR(64) NOT NULL']
      ['first_name', 'VARCHAR(64) NOT NULL']
      ['last_name', 'VARCHAR(64) NOT NULL']
    ]

    col_str = ''
    for [name, type], idx in COLUMNS
      if idx > 0
        col_str += ', '
      col_str += "#{name} #{type}"

    query_str = "CREATE TABLE IF NOT EXISTS users (#{col_str})"
    @_conn.query query_str, (err, result) =>
      return cb err if err
      return cb null

  make_user: (username, pass_hash, info, cb) ->
    data =
      username: username
      password: pass_hash
      first_name: info.first_name
      last_name: info.last_name

    @_conn.query 'INSERT INTO users SET ?', data, (err, result) =>
      return cb err if err
      # TODO: what if username already exists?
      user = new User result.insertId, username, info.first_name, info.last_name
      return cb null, user

  get_user: (uid, cb) ->
    uid_int = parseInt (uid.slice 1)
    args = [uid_int]
    @_conn.query 'SELECT * FROM users WHERE id=?', args, (err, rows) =>
      return cb err if err
      user = if rows.length > 0
        User.load_row rows[0]
      else
        null
      return cb null, user

  authorize: (username, pass_hash, cb) ->
    args = [username]
    @_conn.query 'SELECT * FROM users WHERE username=?', args, (err, rows) =>
      return cb err if err
      if rows.length == 0
        return cb null, null

      row = rows[0]
      if row.password != pass_hash
        return cb null, null
      return cb null, (User.load_row row)

exports.User = User
exports.UserStore = UserStore