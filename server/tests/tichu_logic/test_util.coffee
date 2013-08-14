assert = require 'assert'
readline = require 'readline'
tichu_logic_m = require '../../tichu_logic.js'

exports.rand_int = rand_int = (n) ->
  return Math.floor (Math.random() * n)

exports.get_disp_val = get_disp_val = (val) ->
  return switch val
    when 14 then 'A'
    when 13 then 'K'
    when 12 then 'Q'
    when 11 then 'J'
    else val + ''

exports.make_card_str = make_card_str = (card) ->
  SUIT_ABBREVS =
    Club: 'C'
    Diamond: 'D'
    Heart: 'H'
    Spade: 'S'
  switch card.suit
    when 'Phoenix' then return 'phoenix'
    when 'Dog' then return 'dog'
    when 'Mahjong' then return 'mahjong'
    when 'Dragon' then return 'dragon'
    else
      abbr = SUIT_ABBREVS[card.suit]
      assert abbr?
      return (get_disp_val card.val) + abbr

exports.make_card = make_card = (s) ->
  if s == 'dog'
    return {suit: 'Dog', val: 0.5}
  if s == 'mahjong'
    return {suit: 'Mahjong', val: 1}
  if s == 'dragon'
    return {suit: 'Dragon', val: 16}
  if s == 'phoenix' # TODO: specify value
    return {suit: 'Phoenix', val: -1}

  len = s.length
  suit = s.slice (len - 1), len
  suit = switch suit
    when 'C' then 'Club'
    when 'D' then 'Diamond'
    when 'H' then 'Heart'
    when 'S' then 'Spade'
    else throw new Error "unrecognized suit #{suit}"

  val_str = s.slice 0, len - 1
  val = switch val_str
    when 'A' then 14
    when 'K' then 13
    when 'Q' then 12
    when 'J' then 11
    else parseInt val_str, 10
  return {suit: suit, val: val}

exports.make_hand = make_hand = (raw_card_list) ->
  hand = ((make_card s) for s in raw_card_list)
  hand.sort tichu_logic_m.comparator
  return hand

class HandGenerator
  ALL_CARDS = ['phoenix', 'dog', 'dragon', 'mahjong']
  for i in [2..14]
    for c in 'CDHS'
      ALL_CARDS.push (i + c)

  pick_random_k = (l, k) ->
    assert l.length >= k
    num_left = k
    ret = []
    for item, idx in l
      if Math.random() < (num_left / (l.length - idx))
        ret.push item
        num_left--
    return ret

  @draw_n = (n, excluding = []) ->
    assert (n + excluding.length <= ALL_CARDS.length)
    excluding = ((make_card_str c) for c in excluding)

    hand = []
    while hand.length < n
      idx = rand_int ALL_CARDS.length
      card = ALL_CARDS[idx]
      if card in hand or card in excluding
        continue
      hand.push card
    return make_hand hand

  @draw_ntuple = (n) ->
    assert n <= 4
    k = 2 + (rand_int 13)
    k_cards = []
    for c in ALL_CARDS
      if (make_card c).val == k
        k_cards.push c
    ntuple = pick_random_k k_cards, n
    return make_hand ntuple

  @draw_random_fullhouse = ->
    # TODO: include phoenix?
    n = m = null
    while n is m
      n = 2 + (rand_int 13)
      m = 2 + (rand_int 13)
    [n_cards, m_cards] = [[], []]
    for c in ALL_CARDS
      if (make_card c).val == n
        n_cards.push c
      if (make_card c).val == m
        m_cards.push c

    trips = pick_random_k n_cards, 3
    pair = pick_random_k m_cards, 2
    return make_hand (trips.concat pair)

  @draw_random_play = (type = null) ->
    n = 1 + (rand_int 6)

    while true
      hand = @draw_n n
      type_info = tichu_logic_m.evaluate_hand hand
      if type_info is null
        continue

      if type is null or type_info.type is type
        return hand


class InteractiveTester
  constructor: (@display_fn) ->
    @_bad_cases = []
    @_rl = readline.createInterface {
      input: process.stdin
      output: process.stdout
    }

  run_loop: ->
    case_data = @display_fn()
    @_rl.question 'Hit enter if correct, type n if wrong: ', (answer) =>
      answer = answer.trim()
      if answer isnt ''
        console.log 'Bad case recorded.'
        @_bad_cases.push case_data
      @run_loop()

  run: ->
    process.on 'exit', =>
      console.log '\nBad cases encountered:\n\n'
      console.log (JSON.stringify @_bad_cases)
      console.log '\n\n'
    @run_loop()

exports.HandGenerator = HandGenerator
exports.InteractiveTester = InteractiveTester


