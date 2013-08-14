var assert = require ('assert');

var HAND_TYPES = ['TUPLE', 'STRAIGHT', 'FULLHOUSE', 'TRACTOR', 'BOMB'];


// Compare cards. Sort by value, then by suit.
// 2,3,4,...,J,Q,K,A,Dog,Dragon,Mahjong,Phoenix
function comparator(a, b) {
  if (a.val == b.val) {
    if (a.suit == b.suit) return 0;
    return (a.suit > b.suit) ? 1 : -1;
  }
  return a.val - b.val;
}


function val_from_input(input) {
  var val = -1;
  if (input == "A") val = 14;
  else if (input == "K") val = 13;
  else if (input == "Q") val = 12;
  else if (input == "J") val = 11;
  else val = parseInt(input);
  return val;
}

function num_phoenixes(hand) {
  return has_card(hand, -1, "Phoenix") ? 1 : 0;
}

// if suit unspecified, doesn't check for it.
function has_card(hand, val, suit) {
  for (var i = 0; i < hand.length; i++) {
    if (hand[i].val == val && (suit == undefined || hand[i].suit == suit)) {
      return true;
    }
  }
  return false;
}

// if suit unspecified, doesn't check for it.
function count_num_cards_with_specified_val(hand, val) {
  var num = 0;
  for (var i = 0; i < hand.length; i++) {
    if (hand[i].val == val) {
      num++;
    }
  }
  return num;
}

// returns the length of the longest straight, starting on card specified.
// otherwise, return -1.
function get_longest_straight_flush_starting_on(hand, card) {
  var ret_hand = [];
  for (var i = 0; i < 14; i++) {
    if (!has_card(hand, card.val + i, card.suit)) {
      break;
    }
    ret_hand.push({"suit": card.suit, "val" : card.val + i})
  }
  if (ret_hand.length >= 5) {
    return ret_hand;
  }
  return [];
}

// allowing phoenix usage
function has_straight_starting_on(hand, val, size) {
  var num_phoenixes_required = 0;
  for (var i = 0; i < size; i++) {
    if (!has_card(hand, val + i)) {
      num_phoenixes_required++;
    }
    if (num_phoenixes_required > 1) {
      return false;
    }
  }
  return num_phoenixes(hand) >= num_phoenixes_required;
}

// allowing phoenix usage
function has_tractor_starting_on(hand, val, size) {
  var num_phoenixes_required = 0;
  for (var i = 0; i < size; i++) {
    var num_cards_with_specified_val = count_num_cards_with_specified_val(hand, val + i);
    if (num_cards_with_specified_val < 2) {
      num_phoenixes_required += 2 - num_cards_with_specified_val;
    }
    if (num_phoenixes_required > 1) {
      return false;
    }
  }
  return num_phoenixes(hand) >= num_phoenixes_required;
}

// tries to make a bomb from the hand including card of value "val"
// returns the highest value of possible bombs if any exist, otherwise return -1.
function get_best_bomb(hand, val) {
  var best_bomb = [];
  var best_bomb_val = -1;

  // first check for straight flushes, which are higher value
  for (var i = 0; i < hand; i++) {
    // first restrict to bombs including val.
    if (hand[i].val <= val && hand[i].val + 4 >= val) {
      var temp = get_longest_straight_flush_starting_on(hand, hand[i]);
      var temp_info = evaluate_hand(temp);
      if (temp_info.value > best_bomb_val) {
        best_bomb = clone(temp);
        best_bomb_val = temp_info.value;
      }
    }
  }
  if (best_bomb.length >= 5) return best_bomb;

  if (best_bomb == [] && count_num_cards_with_specified_val(hand, val) == 4) {
    // TODO(joywzhang): make less hacky
    best_bomb.push({"suit" : "Club", "val" : val});
    best_bomb.push({"suit" : "Diamond", "val" : val});
    best_bomb.push({"suit" : "Heart", "val" : val});
    best_bomb.push({"suit" : "Spade", "val" : val});
    return best_bomb;
  }
  return null;
}

function has_full_house_with_trips_of(hand, triple_val, pair_val) {
  // Trip & Pair cannot be of same value in a Full house.
  if (pair_val == triple_val) return false;
  var num_phx = num_phoenixes(hand);
  var num_cards_with_triple_val = count_num_cards_with_specified_val(hand, triple_val);
  if (num_cards_with_triple_val + num_phx < 3) {
    return false;
  }

  if (num_cards_with_triple_val < 3) {
    // Phoenix used in trips, cannot use it in pair.
    // Find pair!
    if (pair_val) {
      return (count_num_cards_with_specified_val(hand, pair_val) >= 2);
    }
    for (var i = 2; i <= 14; i++) {
      // Trip & Pair cannot be of same value in a Full house.
      if (i == triple_val) continue;
      if (count_num_cards_with_specified_val(hand, i) >= 2) return true;
    }
    return false;
  }

  if (num_cards_with_triple_val >= 3) {
    // Phoenix not used in trips, feel free to use it in pair.
    if (pair_val) {
      return (count_num_cards_with_specified_val(hand, pair_val) + num_phx >= 2);
    }
    for (var i = 2; i <= 14; i++) {
      // Trip & Pair cannot be of same value in a Full house.
      if (i == triple_val) continue;
      if (count_num_cards_with_specified_val(hand, i) + num_phx >= 2) return true;
    }
    return false;
  }

  // throw exception, cannot reach this code.
  return false;
}

function has_tractor_starting_on(hand, val, size) {
  var num_phoenixes_required = 0;
  for (var i = 0; i < size; i++) {
    var num_cards_with_specified_val = count_num_cards_with_specified_val(hand, val + i);
    if (num_cards_with_specified_val < 2) {
      num_phoenixes_required += 2 - num_cards_with_specified_val;
    }
    if (num_phoenixes_required > 1) {
      return false;
    }
  }
  return num_phoenixes(hand) >= num_phoenixes_required;
}

function can_satisfy_mahjong_wish(prev_hand, entire_hand, mahjong_wish) {
  assert(mahjong_wish != null);
  assert(mahjong_wish != undefined);

  var mahjong_wish_val = val_from_input(mahjong_wish);

  // TODO(joywzhang): turn those into asserts... handle bad input clientside
  if (mahjong_wish_val > 14 || mahjong_wish_val < 2) {
    return false;
  }

  var has_wish_val = has_card(entire_hand, mahjong_wish_val);

  // If you don't have the wish card, it's impossible for you to fulfill it.
  if (!has_wish_val) {
    return false;
  }

  // If you have lead and have wish card, you can fulfill it (e.g. play it as singleton).
  if (prev_hand.length == 0) {
    return true;
  }

  // If previous play is a singleton, and you have the card, you can play it.
  if (prev_hand.length == 1) {
    return true;
  }

  var prev_hand_info = evaluate_hand(prev_hand);

  // If the mahjong wish card forms a bomb in your hand, you're forced to play.
  var bomb = get_best_bomb(entire_hand, mahjong_wish_val);
  if (bomb && bomb.length >= 4) {  // otherwise invalid.
    var bomb_value = evaluate_hand(bomb).value;
    if (bomb_value > -1) {
      if (prev_hand_info.type != "BOMB") return true;
      // If prev hand IS a bomb, compare values
      return (bomb_value > prev_hand.value);
    }
  }

  // Now, code below assumes you don't have bomb.
  if (prev_hand_info.type == "BOMB") {
    return false;
  }

  if (prev_hand_info.type === 'TUPLE') {
    return (num_phoenixes(entire_hand) +
        count_num_cards_with_specified_val(entire_hand, mahjong_wish_val) >=
        prev_hand_info.size &&
      mahjong_wish_val > prev_hand_info.value);
  }

  if (prev_hand_info.type === 'STRAIGHT') {
    console.log("Straight");
    console.log(prev_hand_info.value);
    // HIGHEST POSSIBLE STRAIGHT STARTING CARD IS 10: (10 J Q K A).

    // FIX TODO(joywzhang):
    for (var i = prev_hand_info.value + 1; i <= 10; i++) {
      if (has_straight_starting_on(entire_hand, i, prev_hand_info.size) &&
          i <= mahjong_wish_val && mahjong_wish_val < i + prev_hand_info.size) {
        console.log("found straight @", i);
        return true;
      }
    }
    return false;
  }

  if (prev_hand_info.type === 'FULLHOUSE') {
    // Highest value of FULLHOUSE is A = 14: (A A A 2 2).
    if (mahjong_wish_val > prev_hand_info.value &&
        has_full_house_with_trips_of(entire_hand, mahjong_wish_val)) {
      return true;
    }

    for (var i = prev_hand_info.value + 1; i <= 14; i++) {
      if (has_full_house_with_trips_of(entire_hand, i, mahjong_wish_val)) {
        return true;
      }
    }
    return false;
  }

  if (prev_hand_info.type === 'TRACTOR') {
    console.log("tractor???");
    // Highest value of tractor is K = 13: K K A A.
    for (var i = prev_hand_info.value + 1; i <= 13; i++) {
      console.log("loop", i);
      if (has_tractor_starting_on(entire_hand, i, prev_hand_info.size) &&
          i <= mahjong_wish_val && mahjong_wish_val < i + prev_hand_info.size) {
        console.log("found tractor @ ", i)
        return true;
      }
    }
    return false;
  }

  throw new Error("Unknown type " + prev_hand_info.type);

  // If you have the wish card but previously played card is not a singleton... it's more complicated!
  // TODO(joywzhang): implement this... enforce mahjong wish rule
  return false;
}

function does_satisfy_mahjong_wish(hand, mahjong_wish) {
  assert(mahjong_wish != null);
  assert(mahjong_wish != undefined);
  var mahjong_wish_val = val_from_input(mahjong_wish);
  // TODO(joywzhang): turn those into asserts... handle bad input clientside
  if (mahjong_wish_val > 14 || mahjong_wish_val < 2) {
    return false;
  }
  for (var i = 0; i < hand.length; i++) {
    if (hand[i].val == mahjong_wish_val) {
      return true;
    }
  }
  return false;
}

function apply_phoenix_transformation(hand, phoenix_choice, last_hand_played) {
  if (hand.length == 1) {
    if (hand[0].suit != "Phoenix") {
      return false;
    }
    if (last_hand_played.length == 0) {
      hand[0].val = 1.5;
      return true;
    }
    if (last_hand_played.length == 1) {
      hand[0].val = last_hand_played[0].val + 0.5;
      return true;
    }
    return false;
  }

  if (phoenix_choice == undefined) {
    return false;
  }

  var phoenix_value = val_from_input(phoenix_choice);

  // TODO(joywzhang): turn those into asserts... handle bad input clientside
  if (phoenix_value > 14 || phoenix_value < 2) {
    return false;
  }

  for (var i = 0; i < hand.length; i++) {
    if (hand[i].suit == "Phoenix") {
      var old_value = hand[i].val;

      // temporarily set value
      hand[i].val = phoenix_value;

      // if bomb, revert and return false.
      if (is_bomb(hand)) {
        hand[i].val = old_value;
        return false;
      }
      return true;
    }
  }
}

function evaluate_hand(hand) {
  var sorted_hand = hand.slice();
  sorted_hand.sort(comparator);

  var type_info = get_hand_type(sorted_hand);
  if (type_info == null) return null;

  type_info.value = get_hand_value(sorted_hand, type_info);
  return type_info;
}


// returns true if hand and other_hand are of the same type & same size,
// and hand is strictly better than other_hand: hand > other_hand
function is_playable_over(hand, other_hand) {
  var hand_info = evaluate_hand(hand);
  var other_hand_info = evaluate_hand(other_hand);

  // you can never play over a dog with a single.
  console.log("is playable over?");
  console.log("hand", hand);
  console.log("other hand", other_hand);
  console.log("hand_info", hand_info);
  console.log("other_hand_info", other_hand_info);
  if (hand_info.type != "BOMB" && other_hand[0].suit == "Dog") {
    return false;
  }

  if (hand_info.type == "BOMB" && other_hand_info.type != "BOMB") {
    return true;
  }

  return (hand_info.type == other_hand_info.type &&
    hand_info.size == other_hand_info.size &&
    hand_info.value > other_hand_info.value);
}

// ALL FUNCTIONS BELOW ASSUME THAT HAND IS SORTED:

function get_hand_value(hand, type_info) {
  if (type_info.type === 'TUPLE') {
    return hand[0].val;
  } else if (type_info.type === 'STRAIGHT') {
    return hand[0].val;
  } else if (type_info.type === 'FULLHOUSE') {
    // either first three or last three are the triple
    return hand[2].val;
  } else if (type_info.type === 'TRACTOR') {
    return hand[0].val;
  } else if (type_info.type === 'BOMB') {
    if (is_n_tuple(hand, 4))
      return hand[0].val;
    var BOMB_GAP = 100; // number we add so that all straight
                        // flushes beat all quads
    // must be a straight flush
    return hand[0].val + BOMB_GAP * hand.length;
  } else {
    throw new Error("Unknown type " + type_info.type);
  }
}

function get_hand_type(hand) {
    if (hand.length == 0)
        return null;
    if (is_bomb(hand))
        return {
            type: 'BOMB',
            size: null
        };
    if (is_n_tuple(hand, hand.length))
        return {
            type: 'TUPLE',
            size: hand.length
        };
    if (is_fullhouse(hand))
        return {
            type: 'FULLHOUSE',
            size: null
        };
    if (is_straight(hand))
        return {
            type: 'STRAIGHT',
            size: hand.length
        };
    if (hand.length % 2 === 0 && is_tractor_n(hand, hand.length / 2))
        return {
            type: 'TRACTOR',
            size: (hand.length / 2)
        };
    return null;
}

function is_n_tuple(hand, n) {
  if (hand.length == 0)
    return false;
  if (hand.length != n)
    return false;
  var val = hand[0].val;
  for (var i = 0; i < hand.length; i++)
    if (val != hand[i].val)
      return false;
  return true;
}

function is_fullhouse(hand) {
  if (hand.length != 5)
    return false;
  if (is_n_tuple(hand.slice(0, 3), 3) && is_n_tuple(hand.slice(3, 5), 2))
    return true;
  if (is_n_tuple(hand.slice(0, 2), 2) && is_n_tuple(hand.slice(2, 5), 3))
    return true;
  return false;
}

function is_straight(hand) {
  if (hand.length < 5)
    return false;
  var min_val = hand[0].val
  for (var i = 1; i < hand.length; i++)
    if (hand[i].val != min_val + i)
      return false;
  return true;
}

function is_tractor_n(hand, n) {
  if (n < 2 || hand.length != 2 * n)
    return false;
  var min_val = hand[0].val;
  for (var i = 0; i < n; i++) {
    if (hand[2 * i].val != hand[2 * i + 1].val)
      return false;
    if (hand[2 * i].val != min_val + i)
      return false;
  }
  return true;
}

function is_straight_flush(hand) {
  if (!is_straight(hand))
    return false;
  var suit = hand[0].suit;
  for (var i = 0; i < hand.length; i++) {
    if (suit != hand[i].suit) {
      return false;
    }
  }
  return true;
}

function is_bomb(hand) {
  return is_n_tuple(hand, 4) || is_straight_flush(hand);
}

exports.comparator = comparator;
exports.evaluate_hand = evaluate_hand;
exports.is_playable_over = is_playable_over;
exports.apply_phoenix_transformation = apply_phoenix_transformation;
exports.can_satisfy_mahjong_wish = can_satisfy_mahjong_wish;
exports.does_satisfy_mahjong_wish = does_satisfy_mahjong_wish;