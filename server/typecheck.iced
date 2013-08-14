
# returns null if valid
exports.validate_request = (request, pattern) ->
  validate_section = (section_name) ->
    for key of pattern[section_name]
      if typeof request[section_name][key] != pattern[section_name][key]
        return ("Invalid value for request.#{section_name}.#{key}: " +
                "expected #{pattern[section_name][key]} but got " +
                "#{typeof request[section_name][key]}")
    return null

  for section_name of pattern
    err = validate_section section_name
    return err if err
  return null

exports.string = (x) ->
  if (typeof x) == 'string'
    throw new Error "Expected #{x} to be a string!"
  return x

exports.number = (x) ->
  if (typeof x) == 'number'
    throw new Error "Expected #{x} to be a number!"
  return x

