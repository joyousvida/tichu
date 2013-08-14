fs = require 'fs'
path = require 'path'

iced_compiler = require 'iced-coffee-script'
browserify = require 'browserify'
mustache = require 'mustache'
through = require 'through'

class JsCache
  COMPILED_JS_DIR = __dirname + '/../static/compiled_js'
  CLIENT_JS_DIR = __dirname + '/../client'

  constructor: ->
    @transform_fn = (file) ->
      data = ''
      write = (buf) ->
        data += buf
      end = ->
        try
          compiled_src = iced_compiler.compile data
        catch e
          # TODO: handle error
          console.error "Couldn't compile #{file}"
          throw e

        @queue compiled_src
        @queue null
      return (through write, end)

    @_cache = {} # TODO: make dirty when files change

  get_compiled: (path, cb) ->
    if @_cache[path]?
      return cb null, @_cache[path]

    abs_path = CLIENT_JS_DIR + '/' + path
    await @_compile abs_path, defer err, js_string
    return cb err if err

    js_path = COMPILED_JS_DIR + '/' + path
    await fs.writeFile js_path, js_string, defer err
    return cb err if err

    @_cache[path] = js_path
    return cb null, js_path

  _compile: (path, cb) ->
    b = browserify()
    b.transform transform_fn
    b.add path
    b.bundle {}, (err, js_string) ->
      return cb err if err
      return cb null, js_string

# TODO: set this up elsewhere
_global_cache = new JsCache

render_template = (path, params, opts, cb) ->
  js_deps = opts.js_deps ? []
  params.js_deps = []

  for path in js_deps
    await _global_cache.get_compiled path, defer err, js_path
    return cb err if err
    params.js_deps.push "/compiled_js/#{path}"

  static_dir = __dirname + '/../static'
  fs.readFile (static_dir + '/' + path), 'utf8', (error, data) ->
    return cb err if err
    return cb null, mustache.render(data, params)

exports.render_template = render_template
exports.JsCache = JsCache