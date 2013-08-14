assert = require 'assert'
tichu_logic_m = require '../../tichu_logic.js'
test_util_m = require './test_util'

HandGenerator = test_util_m.HandGenerator
InteractiveTester = test_util_m.InteractiveTester
make_card = test_util_m.make_card
make_hand = test_util_m.make_hand

suits = 'CDHS'
bomb8 = make_hand ['8H', '8S', '8D', '8C']
straightflush3to7 = make_hand ['3S', '4S', '5S', '6S', '7S']
straight3to7 = make_hand ['3S', '4S', '5S', '6S', '7C']
straight3to12 = make_hand ((i + suits[i % 4]) for i in [3..12])

# tractor4and5 = make_hand ['4H', '4C', '5D', '5C']
# player_hand1 = make_hand ['phoenix', '2H', '2S', '3C', '4D', '4H', '6C',
#                           '7D', '8H', 'QC', 'KC', 'KH', 'KS', 'AH']
# player_hand2 = make_hand ['2H', '3S', '3C', '4D', '4S', '6C', '6D',
#                           '7D', '8H', 'QC', 'KC', 'KH', 'KS', 'AH']
# player_hand3 = make_hand ['2H', '3S', '3C', '4D', '4S', '6C', '6D',
#                           '7D', 'QH', 'QC', 'KC', 'KH', 'KS', 'AH']

# ace_pair = make_hand ['AD', 'AH']
# player_hand4 = make_hand ['2D', '2S', '3H', '4C', '4D', '5H', '6C',
#                           '8S', '11C', '11S', '12S', '13C', '13H', '13S']

PLAYABLE_OVER_TEST_CASES = [
  '{"prev_hand":[{"suit":"Diamond","val":6},{"suit":"Heart","val":6},{"suit":"Spade","val":6}],"cur_hand":[{"suit":"Club","val":14},{"suit":"Heart","val":14}],"result":false}'
  '{"prev_hand":[{"suit":"Club","val":4},{"suit":"Heart","val":4},{"suit":"Spade","val":4},{"suit":"Diamond","val":13},{"suit":"Spade","val":13}],"cur_hand":[{"suit":"Heart","val":2},{"suit":"Spade","val":2},{"suit":"Diamond","val":12},{"suit":"Heart","val":12},{"suit":"Spade","val":12}],"result":true}'
  ]

test_is_playable_over = ->
  assert not (tichu_logic_m.is_playable_over bomb8, straightflush3to7)
  assert (tichu_logic_m.is_playable_over bomb8, straight3to12)

  for test_case_str in PLAYABLE_OVER_TEST_CASES
    test_case = JSON.parse test_case_str
    {prev_hand, cur_hand, result} = test_case
    assert result is tichu_logic_m.is_playable_over cur_hand, prev_hand


tester = new InteractiveTester ->
  prev_hand = HandGenerator.draw_random_play()
  cur_hand = HandGenerator.draw_random_play()

  console.log 'prev hand', prev_hand
  console.log 'cur hand', cur_hand

  result = tichu_logic_m.is_playable_over cur_hand, prev_hand
  console.log 'program thinks you can play?', result

  return {
    prev_hand: prev_hand
    cur_hand: cur_hand
    result: result
  }
tester.run()
