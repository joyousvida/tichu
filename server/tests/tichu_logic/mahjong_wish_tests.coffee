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

tractor4and5 = make_hand ['4H', '4C', '5D', '5C']
player_hand1 = make_hand ['phoenix', '2H', '2S', '3C', '4D', '4H', '6C',
                          '7D', '8H', 'QC', 'KC', 'KH', 'KS', 'AH']
player_hand2 = make_hand ['2H', '3S', '3C', '4D', '4S', '6C', '6D',
                          '7D', '8H', 'QC', 'KC', 'KH', 'KS', 'AH']
player_hand3 = make_hand ['2H', '3S', '3C', '4D', '4S', '6C', '6D',
                          '7D', 'QH', 'QC', 'KC', 'KH', 'KS', 'AH']

ace_pair = make_hand ['AD', 'AH']
player_hand4 = make_hand ['2D', '2S', '3H', '4C', '4D', '5H', '6C',
                          '8S', '11C', '11S', '12S', '13C', '13H', '13S']


MAHJONG_WISH_TEST_CASES = [
  '{"prev_hand":[{"suit":"Heart","val":5},{"suit":"Diamond","val":6},{"suit":"Spade","val":7},{"suit":"Spade","val":8},{"suit":"Heart","val":9}],"player_hand":[{"suit":"Phoenix","val":-1},{"suit":"Club","val":2},{"suit":"Club","val":3},{"suit":"Spade","val":3},{"suit":"Club","val":4},{"suit":"Spade","val":7},{"suit":"Club","val":8},{"suit":"Diamond","val":8},{"suit":"Diamond","val":9},{"suit":"Diamond","val":10},{"suit":"Club","val":11},{"suit":"Heart","val":11},{"suit":"Spade","val":12},{"suit":"Heart","val":14}],"wish":2,"result":false}'
  '{"prev_hand":[{"suit":"Club","val":5},{"suit":"Spade","val":5}],"player_hand":[{"suit":"Phoenix","val":-1},{"suit":"Spade","val":2},{"suit":"Heart","val":3},{"suit":"Diamond","val":4},{"suit":"Spade","val":5},{"suit":"Spade","val":7},{"suit":"Diamond","val":8},{"suit":"Heart","val":8},{"suit":"Diamond","val":9},{"suit":"Spade","val":9},{"suit":"Diamond","val":10},{"suit":"Heart","val":11},{"suit":"Club","val":12},{"suit":"Diamond","val":13}],"wish":5,"result":false}
'
  '{"prev_hand":[{"suit":"Diamond","val":2},{"suit":"Heart","val":2},{"suit":"Spade","val":2},{"suit":"Heart","val":13},{"suit":"Spade","val":13}],"player_hand":[{"suit":"Dog","val":0.5},{"suit":"Club","val":3},{"suit":"Diamond","val":3},{"suit":"Club","val":4},{"suit":"Diamond","val":4},{"suit":"Spade","val":4},{"suit":"Club","val":5},{"suit":"Diamond","val":6},{"suit":"Club","val":9},{"suit":"Diamond","val":9},{"suit":"Heart","val":10},{"suit":"Club","val":11},{"suit":"Diamond","val":12},{"suit":"Diamond","val":13}],"wish":6,"result":false}'
  ]


test_is_playable_over = ->
  assert not (tichu_logic_m.is_playable_over bomb8, straightflush3to7)
  assert (tichu_logic_m.is_playable_over bomb8, straight3to12)

test_can_satisfy_mahjong_wish = ->
  test_set = (prev_hand, player_hand, wish, expected) ->
    print_info = ->
      console.log 'prev hand', prev_hand
      console.log 'player hand', player_hand
      console.log 'wish', wish

    try
      result = tichu_logic_m.can_satisfy_mahjong_wish prev_hand, player_hand, wish
    catch e
      print_info()
      throw e

    unless result is expected
      print_info()
      throw new Error "Assertion error: expected #{expected} but got #{result}"

  test_set tractor4and5, player_hand3, 'K', true
  test_set tractor4and5, player_hand2, 'K', false
  test_set tractor4and5, player_hand1, 'K', true
  test_set ace_pair, player_hand4, 'K', false

  for test_case_str in MAHJONG_WISH_TEST_CASES
    {prev_hand, player_hand, wish, result} = JSON.parse test_case_str
    wish = test_util_m.get_disp_val wish
    test_set prev_hand, player_hand, wish, result

test_is_playable_over()
test_can_satisfy_mahjong_wish()


tester = new InteractiveTester ->
  prev_hand = HandGenerator.draw_random_fullhouse()
  wish = 2 + (test_util_m.rand_int 13)
  player_hand = HandGenerator.draw_n 14, prev_hand

  console.log 'prev hand', prev_hand
  console.log 'player hand', player_hand
  console.log 'wish', wish

  result = tichu_logic_m.can_satisfy_mahjong_wish prev_hand, player_hand, wish
  console.log 'program thinks you can play?', result

  return {
    prev_hand: prev_hand
    player_hand: player_hand
    wish: wish
    result: result
  }
tester.run()
