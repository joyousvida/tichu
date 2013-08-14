clone = (item) ->
  return JSON.parse(JSON.stringify(item))

# Shuffle array in-place using Fisher-Yates shuffle algorithm.
shuffle = (array) ->
  i = array.length - 1
  while i > 0
    j = Math.floor(Math.random() * (i + 1))
    temp = array[i]
    array[i] = array[j]
    array[j] = temp
    i--

exports.clone = clone
exports.shuffle = shuffle