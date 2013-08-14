
class EventManager
  constructor: ->
    @_listeners = []

  register: (src, evt, listener) ->
    src.on evt, listener
    @_listeners.push [src, evt, listener]

  unregister_all: ->
    for [src, evt, listener] in @_listeners
      src.off evt, listener
    @_listeners = []


assert = (statement, mesg) ->
  unless statement
    throw new Error "Assertion error: #{mesg}"

get_pos = (elt) ->
  dom_elt = elt[0]
  lx = ly = 0
  while dom_elt?
    lx += dom_elt.offsetLeft
    ly += dom_elt.offsetTop
    dom_elt = dom_elt.offsetParent
  return [lx, ly]

set_pos = (elt, x, y) ->
  elt.css {top: y, left: x}


class ArrangeableList
  DEFAULT_ZINDEX = 20
  ITEM_STYLES =
    position: 'absolute'
    '-moz-user-select': '-moz-none'
    '-khtml-user-select': 'none'
    '-webkit-user-select': 'none'
    '-ms-user-select': 'none'
    'user-select': 'none'

  constructor: (@dims, @list = []) ->
    @_zindex = @dims.zindex ? DEFAULT_ZINDEX
    @_elt = ($ '<div>').height(@dims.height).css('position', 'relative')

    for elt, idx in @list
      @insert idx, elt

    @_dragging = null
    @_orig_idx = null
    @_placeholder_idx = null

    @_click_evt_mgr = new EventManager

  # _print_list: ->
  #   console.log ((if elt? then elt.text() else 'null') for elt in @list)

  is_dragging: ->
    return @_dragging?

  render: -> # "render"s by recalculating positions
    offset = 0
    for item, idx in @list
      if item?
        set_pos item, offset, 0
      offset += @get_width idx

    @_elt.width offset

  get_width: (idx) ->
    item = @list[idx]
    if item?
      return item.width()
    assert idx is @_placeholder_idx
    return @_dragging.width()

  get_nearest_idx: (x, y) ->
    if y < 0 or y > 2 * @dims.height
      return null
    return null if x < 0

    offset = 0
    for item, idx in @list
      if not item?
        assert idx is @_placeholder_idx
      offset += @get_width idx
      return idx if x < offset
    return null

  _onmousemove: (evt) ->
    return unless @_dragging?

    [cont_x, cont_y] = get_pos @_elt
    [x, y] = [evt.pageX - cont_x, evt.pageY - cont_y]

    half_w = Math.floor (@_dragging.width() / 2)
    half_h = Math.floor (@dims.height / 2)

    set_pos @_dragging, (x - half_w), (y - half_h)
    # TODO: record relative

    new_placeholder = @get_nearest_idx x, y

    if not new_placeholder?
      if @_placeholder_idx?
        @list.splice @_placeholder_idx, 1
        @_placeholder_idx = null

    else
      if @_placeholder_idx?
        new_placeholder -= (if @_placeholder_idx < new_placeholder then 1 else 0)
        @list.splice @_placeholder_idx, 1
      @list.splice new_placeholder, 0, null
      @_placeholder_idx = new_placeholder

    @render()
    return false

  set_dragging: (elt, idx) ->
    throw new Error "already dragging" if @_dragging?
    @_dragging = elt
    @_dragging.css 'z-index', (@_zindex + 1)

    @_click_evt_mgr.register ($ window), 'mousemove', (@_onmousemove.bind @)
    @_click_evt_mgr.register ($ window), 'mouseup', (@unset_dragging.bind @)

    @_orig_idx = idx
    @_placeholder_idx = idx
    @list[idx] = null

  unset_dragging: ->
    throw new Error "not currently dragging" unless @_dragging?
    @_dragging.css 'z-index', @_zindex

    if @_placeholder_idx?
      @list[@_placeholder_idx] = @_dragging

    else
      @list.splice @_orig_idx, 0, @_dragging

    @_dragging = @_orig_idx = @_placeholder_idx = null
    @_click_evt_mgr.unregister_all()

    @render()

  insert: (before_idx, elt) ->
    assert before_idx <= @list.length

    container = ($ '<div>').append elt
    container.css ITEM_STYLES
    container.css 'z-index', @_zindex
    container.mousedown =>
      for item, idx in @list
        if item is container
          @set_dragging container, idx
          return

    if before_idx == @list.length
      @_elt.append container
    else
      target = @_elt.children().get before_idx
      assert target?
      container.insertBefore target
    @list.splice before_idx, 0, container

    @render()

  remove: (elt) ->
    assert elt?
    if elt is @_dragging
      @unset_dragging()

    for list_elt, idx in @list
      if elt is list_elt
        @list.splice idx, 1
        break

    elt.detach() # TODO: kill listeners too?
    @render()

  length: -> @list.length

  elt: -> @_elt


window.ArrangeableList = ArrangeableList

# window.onload = ->
#   dims =
#     width: 110
#     height: 50
#   al = new ArrangeableList dims

#   ($ document.body).append al.elt()

#   for i in [0...5]
#     al.insert 0, ($ "<div>#{i}</div>").addClass('x')