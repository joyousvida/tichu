class SignupWidget
  DEFAULT_NEXT = '/'
  WIDGET_TMPL = '''
    <div>
      <div>
        <span>Name</span>
        <input placeholder="First" class="first-name-input" type="text"></input>
        <input placeholder="Last" class="last-name-input" type="text"></input>
      </div>
      <div>
        <span>Username</span>
        <input class="username-input" type="text"></input>
      <div>
      <div>
        <span>Password</span>
        <input class="password-input" type="text"></input>
      <div>
      <button class="sign-up-button">Sign up!</button>
      <div class="status-area"></div>
    </div>
  '''

  constructor: (defaults = {}, @next = DEFAULT_NEXT) ->
    @_elt = $ WIDGET_TMPL
    (@_elt.find 'button.sign-up-button').click (@do_signup.bind @)

    if defaults.username?
      (@_elt.find 'input.username-input').val defaults.username
    if defaults.password?
      (@_elt.find 'input.password-input').val defaults.password
    @_status_area = @_elt.find 'div.status-area'

  elt: ->
    return @_elt

  set_status: (text) ->
    @_status_area.text text

  do_signup: ->
    first_name = @_elt.find('input.first-name-input').val()
    last_name = @_elt.find('input.last-name-input').val()

    username = @_elt.find('input.username-input').val()
    password = @_elt.find('input.password-input').val()

    # TODO: better error messages
    if first_name == '' or last_name == ''
      return @set_status "Invalid first or last name."
    if username == '' or password == ''
      return @set_status "Invalid username or password."

    data =
      username: username
      password: password
      signup: true
      info:
        first_name: first_name
        last_name: last_name

    $ajax '/login', data, 'post', (err, res) =>
      if err
        return @set_status err
      if not res.success
        return @set_status res
      window.location.href = @next




class LoginWidget
  DEFAULT_NEXT = '/'
  WIDGET_TMPL = '''
  <div>
    <span>Username</span><input class="username-input" type="text"></input>
    <span>Password</span><input class="password-input" type="text"></input>
    <button class="login-button">Login</button>
    <button class="sign-up-button">Sign up</button>
    <div class="status-area"></div>
  </div>
  '''

  constructor: (on_signup, @next = DEFAULT_NEXT) ->
    @_elt = $ WIDGET_TMPL
    @_username_input = @_elt.find 'input.username-input'
    @_password_input = @_elt.find 'input.password-input'
    @_status_area = @_elt.find 'div.status-area'

    (@_elt.find 'button.login-button').click (@do_login.bind @)
    (@_elt.find 'button.sign-up-button').click on_signup

  elt: ->
    return @_elt

  get_values: ->
    ret =
      username: @_username_input.val()
      password: @_password_input.val()
    return ret

  set_status: (text) ->
    @_status_area.text text

  do_login: ->
    data = @get_values()

    $ajax '/login', data, 'post', (err, res) =>
      if err
        return @set_status err
      if not res.success
        return @set_status res
      window.location.href = @next

attach_login = (container) ->
  login_widget = new LoginWidget ->
    {username, password} = login_widget.get_values()
    container.empty()

    defaults =
      username: username
      password: password

    signup_widget = new SignupWidget defaults
    container.append signup_widget.elt()

  container.append login_widget.elt()