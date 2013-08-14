var util = require("../util");
var assert = require("assert");


var TichuCardsPlayed = function() {
    this.cards_played = [[]];
};

TichuCardsPlayed.prototype.empty = function() {
  return this.cards_played.length == 1 && this.cards_played[0].length == 0;
};

TichuCardsPlayed.prototype.current_trick = function() {
  assert(this.cards_played.length > 0);
  return this.cards_played[this.cards_played.length - 1];
};

TichuCardsPlayed.prototype.start_new_round = function() {
  this.cards_played.push([]);
};

TichuCardsPlayed.prototype.play = function(player_id, hand) {
  console.log("TichuCardsPlayed.prototype.play");
  //if (is_new_trick) {
  //  new_trick = [{'player_id' : player_id, 'hand' : hand}];
  //  this.cards_played.push(new_trick);
  //} else {
  this.current_trick().push(
    {'player_id' : player_id, 'hand' : hand});
  //}
};

TichuCardsPlayed.prototype.pass = function(player_id) {
  console.log("TichuCardsPlayed.prototype.pass");
  // You can only pass if the current trick isn't over and it's your turn.
  // (e.g. you can't lead with a pass.)
  assert(this.cards_played.length > 0);
  if (this.current_trick().length == 0) {
    return false;
  }
  //if (!is_new_trick && (this.get_last_player_to_play() + 1) % 4 == player_id) {
  this.current_trick().push({'player_id' : player_id, 'hand' : []});
  return true;
  //}
  //return false;
};

TichuCardsPlayed.prototype.winner_of_last_trick = function() {
  var trick = this.current_trick();
  winner = -1;
  for (var i = 0; i < trick.length; i++) {
    if (trick[i].hand.length > 0) {
      winner = trick[i].player_id;
    }
  }
  return winner;
};

TichuCardsPlayed.prototype.is_new_trick = function() {
  return (this.current_trick().length == 0);
};

// INCLUDES PLAYERS WHO PASS
TichuCardsPlayed.prototype.get_last_player_to_play = function() {
  var trick = this.current_trick();
  assert(trick.length > 0);
  return trick[trick.length - 1].player_id;
};

// EXCLUDES PASSES
TichuCardsPlayed.prototype.get_last_player_to_play_cards = function() {
  var trick = this.current_trick();
  var it = -1;
  for (var i = 0; i < trick.length; i++) {
    if (trick[i].hand.length > 0) {
      it = trick[i].player_id;
    }
  }
  return it;
};

TichuCardsPlayed.prototype.get_last_consecutive_passers = function() {
  var passed = [null, null, null, null];

  var trick = this.current_trick();
  for (var i = trick.length - 1; i >= 0; i--) {
    if (trick[i].hand.length > 0) {
      break;
    }
    passed[trick[i].player_id] = true;
  }
  return passed;
}

// EXCLUDES PASSES
// if current trick empty, return [].
TichuCardsPlayed.prototype.get_last_hand_played_in_current_trick = function() {
  var trick = this.current_trick();
  var it = -1;
  for (var i = 0; i < trick.length; i++) {
    if (trick[i].hand.length > 0) {
      it = i;
    }
  }
  if (it < 0) return [];
  return util.clone(trick[it].hand);
};

TichuCardsPlayed.prototype.was_last_winner_dog = function() {
  var hand = this.get_last_hand_played_in_current_trick();
  return (hand.length == 1 && hand[0].suit == "Dog");
};

TichuCardsPlayed.prototype.was_last_winner_dragon = function() {
  var hand = this.get_last_hand_played_in_current_trick();
  return (hand.length == 1 && hand[0].suit == "Dragon");
}

TichuCardsPlayed.prototype.get_dragon_master = function() {
  assert(this.was_last_winner_dragon());
  var trick = this.current_trick();

  console.log("trick", trick);
  for (var i = 0; i < trick.length; i++) {
    var play = trick[i];
    console.log("play", play);
    if (play.hand.length > 0 && play.hand[0].suit == "Dragon") {
      console.log("play.hand", play.hand);
      return play.player_id;
    }
  }
  return -1;
};

// static
TichuCardsPlayed.sum_points_in_hand = function(hand) {
  var total_points = 0;
  for (var j = 0; j < hand.length; j++) {
    var temp_card = hand[j];
    if (temp_card.val == 5) {
      total_points += 5;
    }
    if (temp_card.val == 10 || temp_card.val == 13) {
      total_points += 10;
    }
    if (temp_card.suit == 'Phoenix') {
      total_points -= 25;
    }
    if (temp_card.suit == 'Dragon') {
      total_points += 25;
    }
  }
  return total_points;
};

TichuCardsPlayed.prototype.sum_points_of_latest_trick = function() {
  if (this.cards_played.length == 0) return 0;
  trick = this.current_trick();
  if (trick.length == 0) return 0;
  total_points = 0;
  for (var i = 0; i < trick.length; i++) {
    total_points += TichuCardsPlayed.sum_points_in_hand(trick[i].hand);
  }
  return total_points;
};


exports.TichuCardsPlayed = TichuCardsPlayed;