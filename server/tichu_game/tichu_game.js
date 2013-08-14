var TichuPlayer = require("./tichu_player").TichuPlayer;
var TichuCardsPlayed = require("./tichu_cards_played").TichuCardsPlayed;
var tichu_logic = require("./tichu_logic");
var assert = require("assert");
var util = require("../util");

/* useful constants */
var SUITS = ['Diamond','Club','Heart','Spade'];
var TRUMPS = ['Dog','Mahjong','Dragon','Phoenix'];
var TRUMP_VALUES = [0.5, 1, 16, -1];

/* enum start for game stage! */
var DEALT_8 = 0; // Right after 8 cards are dealt. GRAND TICHU ALLOWED.
var DEALT_14 = 1; // After 14 cards are dealt. TICHU ALLOWED.
var PASSING_3 = 2; // During the selection of 3 cards to pass. TICHU NOT ALLOWED.
var GAME_ON = 3; // Game has started. MAHJONG player must start.
var DRAGON_PASS_INTERLUDE = 4; // Dragon just won a trick (after 4'th pass) - wait on points passing decision.
var GAME_OVER = 5; // All players out of cards.
/* enum end */

// enum: this.tichu_state (from tichu_player.js)
var NO_STATUS = 0;
var GRAND_YES = 1;
var GRAND_NO = 2;
var TICHU_YES = 3;
var TICHU_NO = 4;

var TichuGame = function() {

  this.deck = [];
  // Insert 56 tichu cards into this.deck
  for (var suit = 0; suit < SUITS.length; suit++) {
    for (var i = 0; i < 13; i++) {
      // For each suit, insert cards 2,3...,13,14 (K=13,A=14)
      this.deck[suit*13+i] = {'suit' : SUITS[suit], 'val' : i+2 };
    }
  }
  for (var j = 0; j < TRUMPS.length; j++) {
    this.deck[52 + j] = { 'suit' : TRUMPS[j], 'val' :  TRUMP_VALUES[j]};
  }
  util.shuffle(this.deck);

  this.players = [];
  for (var pid = 0; pid < 4; pid++) {
    this.players[pid] = new TichuPlayer(pid);
  }

  this.deal_out_cards(8);
  this.game_stage = DEALT_8;

  this.cards_played = new TichuCardsPlayed();

  this.cards_passed_buffer = [[],[],[],[]];
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      this.cards_passed_buffer[i][j] = null;
    }
  }

  this.dragon_master = -1;

  this.mahjong_wish_outstanding = null;
  // everytime a player goes out (runs out of cards), push their player_id to the back of this list here.
  this.players_who_are_out = [];

  this.next_player_id = -1;



  // DEBUG MODE. SKIP GRANDTICHU/PASSING STEPS
  /*
  this.advance_game_stage(DEALT_14);

  for (var i = 0; i < 4; i++) {
    if (this.players[i].has_mahjong()) {
      this.next_player_id = i;
      break;
    }
  }
  this.game_stage = GAME_ON;

  this.players[0].hand = [{'suit':'Dragon','val':16}];
  */
  // END DEBUG MODE

};

TichuGame.prototype.perform_action = function(action) {
  console.log('perform action');
  if (action.name == "grandtichu") {
    // action.call is a bool that's true if player wants to grand tichu
    return this.grand_tichu(action.player_id, action.call);
  }

  if (action.name == "tichu") {
    // action.call is a bool that's true if player wants to grand tichu
    return this.tichu(action.player_id, action.call);
  }

  if (action.name == "pass_card") {
    return this.pass_card(action.player_id, action.receiver, action.cards);
  }

  if (action.name == "pass") {
    return this.pass(action.player_id);
  }

  if (action.name == "play") {
    return this.play(action.player_id, action.cards, action.phoenix_choice, action.mahjong_choice);
  }

  if (action.name == "assign_dragon_points") {
    return this.assign_dragon_points(action.player_id, action.receiver);
  }

  throw new Error("Unrecognized action " + JSON.stringify(action));
};

TichuGame.prototype.advance_game_stage = function(next_stage) {
  if (this.game_stage != next_stage - 1) {
    console.warn("Transitioning from stage", this.game_stage, "to", next_stage);
  }

  if (this.game_stage == DEALT_8 && next_stage == DEALT_14) {
    this.deal_out_cards(6);
  }

  if (this.game_stage == PASSING_3 && next_stage == GAME_ON) {
    console.log("in game on loopy advancing attempt");
    for (var sender = 0; sender < 4; sender++) {
      for (var receiver = 0; receiver < 4; receiver++) {
        if (sender == receiver) continue;
        var card = this.cards_passed_buffer[sender][receiver];
        //console.log("card", card);
        //console.log("cards", [card]);
        assert(this.players[sender].remove_cards([card]));
        assert(this.players[receiver].add_cards([card]));
      }
    }

    for (var i = 0; i < 4; i++) {
      if (this.players[i].has_mahjong()) {
        this.next_player_id = i;
        break;
      }
    }

  }

  if (next_stage == DRAGON_PASS_INTERLUDE) {
    console.log("DRAGON PASS INTERLUDE~~~");
    console.log("dragon master", this.dragon_master);
    console.log("game stage", this.game_stage);
  }

  if (next_stage == GAME_OVER) {
    //  TODO(joywzhang): handle 1-2 case. game ends early!
    console.log("game over");
    assert(this.players_who_are_out.length >= 2);
    winner_id = this.players_who_are_out[0];

    if ((winner_id + 2 % 4) == this.players_who_are_out[1]) {
      console.log("one two!");
      for (var i = 0; i < 4; i++) {
        this.players[i].points = (winner_id == i) ? 200 : 0;
      }
    } else {
      assert(this.players_who_are_out.length == 3);
      var loser = null;
      for (var i = 0; i < this.players.length; i++) {
        if (!this.players[i].is_out()) {
          loser = i;
          break;
        }
      }
      console.log("loser", loser);

      // loser gives points earned to winner
      this.players[winner].points += this.players[loser].points;
      this.players[loser].points = 0;

      // loser gives point in his hand to opponent.
      this.players[(loser+1) % 4].points += TichuCardsPlayed.sum_points_in_hand(this.players[loser].hand);
    }

    // Add betting scores.
    for (var i = 0; i < 4; i++) {
      var bet = (this.players[i].tichu_state == TICHU_YES) ? 100 : 0;
      bet = (this.players[i].tichu_state == GRAND_YES) ? 200 : bet;

      if (i == winner_id) {
        this.players[i].points += bet;
      } else {
        this.players[i].points -= bet;
      }
    }
    console.log("player 0 and player 2:", this.players[0].points + this.players[2].points);
    console.log("player 1 and player 3:", this.players[1].points + this.players[3].points);
  }

  this.game_stage = next_stage;
  console.log("Advancing to stage ", next_stage);
};

TichuGame.prototype.is_game_over = function() {
  return this.players_who_are_out.length == 3 ||
    (this.players_who_are_out.length == 2 &&
      ((this.players_who_are_out[0] + 2) % 4 == this.players_who_are_out[1]));
};

TichuGame.prototype.increment_next_player_id = function(start) {
  console.log("increment_next_player_id", start);
  console.log("previously, this.next_player_id = ", this.next_player_id);
  console.log("set start to", start);
  for (var i = start; i < start + 4; i++) {
    console.log("loop", i);
    console.log(this.players[(this.next_player_id + i) % 4].hand);
    if (this.players[(this.next_player_id + i) % 4].hand.length > 0) {
      this.next_player_id = (this.next_player_id + i) % 4;
      console.log("set this.next_player_id = ", this.next_player_id);
      return;
    }
  }
  console.log("blahblahblah error");
};


// Cards in players' hands are not sorted yet.
TichuGame.prototype.deal_out_cards = function(num) {
  for (var pid = 0; pid < 4; pid++) {
    var cards = this.deck.splice(0, num);
    this.players[pid].add_cards(cards);
  }
};

TichuGame.prototype.grand_tichu = function(player_id, do_grand_tichu) {
  function r(outcome, reason) { // reason is optional
    reason = (reason === undefined ? null : reason);
    var mesg = null;
    if (outcome)
      mesg = "[" + player_id + (do_grand_tichu ?
                              " grand tichu'ed!]" :
                              " did not grand tichu.]");
    return {outcome: outcome, mesg: mesg, reason: reason};
  }
  if (!this.players[player_id].grand_tichu(do_grand_tichu)) {
    return r(false);
  }
  var num_grands = 0;
  var num_players_responded = 0;
  for (var i = 0; i < this.players.length; i++) {
    if (this.players[i].tichu_state == GRAND_YES ||
        this.players[i].tichu_state == GRAND_NO) {
      num_players_responded++;
    }
    if (this.players[i].tichu_state == GRAND_YES) {
      num_grands++;
    }
  }
  console.log("num_players_responded", num_players_responded);
  console.log("num_grands", num_grands);
  if (num_players_responded == 4) {
    this.advance_game_stage(DEALT_14);
  }

  if (num_grands == 4) {
    this.advance_game_stage(PASSING_3);
  }

  return r(true);
};

TichuGame.prototype.tichu = function(player_id, do_tichu) {
  function r(outcome, reason) { // reason is optional
    reason = (reason === undefined ? null : reason);
    var mesg = null;
    if (outcome)
      mesg = "[" + player_id + (do_tichu ?
                              " tichu'ed!]" :
                              " did not tichu.]");
    return {outcome: outcome, mesg: mesg, reason: reason};
  }
  if (!this.players[player_id].tichu(do_tichu)) {
    return r(false);
  }
  if (this.game_stage == DEALT_14) {
    var num_players_responded = 0;
    for (var i = 0; i < this.players.length; i++) {
      if (this.players[i].tichu_state == GRAND_YES ||
          this.players[i].tichu_state == TICHU_YES ||
          this.players[i].tichu_state == TICHU_NO) {
        num_players_responded++;
      }
      console.log("num_players_responded", num_players_responded);
      if (num_players_responded == 4) {
        this.advance_game_stage(PASSING_3);
      }
    }
  }
  return r(true);
};

TichuGame.prototype.pass_card = function (sender, receiver, cards) {
  function r(outcome, reason) { // reason is optional
    reason = (reason === undefined ? null : reason);
    var mesg = null;
    if (outcome)
      mesg = "[" + sender + " passed a card to " + receiver + "]";
    return {outcome: outcome, mesg: mesg, reason: reason};
  }

  assert(sender != receiver);
  if (cards.length != 1) {
    return r(false);
  }

  // Check that this card isn't already in the cards_passed_buffer! e.g. cannot give the same card to 2 ppl.
  // JUST A SANITY CHECK... this should never happen
  // since client isn't allowed to 'select' those cards anyways.
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      if (i == j) continue;
      if (this.cards_passed_buffer[i].length > j &&
          this.cards_passed_buffer[i][j] != null &&
          this.cards_passed_buffer[i][j].suit == cards[0].suit &&
          this.cards_passed_buffer[i][j].val == cards[0].val) {
        return r(false, "oops, already tried to pass that card");
      }
    }
  }

  this.cards_passed_buffer[sender][receiver] = cards[0];

  console.log(this.cards_passed_buffer);
  var num_cards_passed_in_queue = 0;
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      if (i == j) continue;
      // this.cards_passed_buffer[i].length > j &&
      if (this.cards_passed_buffer[i][j]) {
        num_cards_passed_in_queue++;
      }
    }
  }
  console.log("num_cards_passed_in_queue", num_cards_passed_in_queue);

  if (num_cards_passed_in_queue == 12) {
    this.advance_game_stage(GAME_ON);
  }
  return r(true);
}

TichuGame.prototype.pass = function(player_id) {
  console.log("pass???");
  function r(outcome) {
    var mesg = null;
    if (outcome)
      mesg = "[" + player_id + " successfully passed!]";
    else
      mesg = "[" + player_id + " failed to pass!]";
    return {outcome: outcome, mesg: mesg};
  }

  if (this.game_stage != GAME_ON) {
    return r(false);
  }

  if (this.next_player_id != player_id) {
    return r(false, "not-your-turn");
  }

  if (!this.cards_played.pass(player_id)) {
    return r(false);
  }

  console.log('successfully passed');
  // Keep score?? If your pass is the 4th consecutive pass, the trick is over.
  // Accum points to winner of trick.
  var last_player_of_cards = this.cards_played.get_last_player_to_play_cards();
  if (this.next_player_id == last_player_of_cards ||
      this.players[last_player_of_cards].is_out() && this.all_players_who_are_still_in_have_recently_passed()) {

    if (this.cards_played.was_last_winner_dragon()) {
      this.dragon_master = this.cards_played.get_dragon_master();
      this.next_player_id = this.cards_played.winner_of_last_trick();
      this.advance_game_stage(DRAGON_PASS_INTERLUDE);
      // Don't start new round yet.
      return r(true);
    }

    if (this.cards_played.was_last_winner_dog()) {
      this.increment_next_player_id(2);
      this.cards_played.start_new_round();
      return r(true);
    }

    this.players[this.cards_played.winner_of_last_trick()].add_points(
      this.cards_played.sum_points_of_latest_trick());
    // If the winner went out... player_id could be someone else passing here.
    this.next_player_id = this.cards_played.winner_of_last_trick();
    this.increment_next_player_id(0);
    this.cards_played.start_new_round();

  } else {
    console.log("what");
    this.increment_next_player_id(1);
  }

  return r(true);
};

// TODO: make this work with special cards: MAHJONG
// Returns true or false for whether move was successful.
TichuGame.prototype.play = function(player_id, hand, phoenix_choice, mahjong_choice) {
  function r(outcome, reason) {
    reason = (reason === undefined ? null : reason);
    var mesg = null;
    if (outcome)
      mesg = "[" + player_id + " successfully played!]";
    else
      mesg = "[" + player_id + " failed to play!]";
    return {outcome: outcome, mesg: mesg, reason: reason};
  }

  console.log("tichu_game.play");
  if (this.game_stage != GAME_ON) {
    return r(false, 'invalid-game-stage');
  }

  //console.log(player_id, hand, phoenix_choice);
  // Handle phoenix! :)
  tichu_logic.apply_phoenix_transformation(
    hand, phoenix_choice,
    this.cards_played.get_last_hand_played_in_current_trick());
  //console.log(player_id, hand, phoenix_choice);

  var hand_info = tichu_logic.evaluate_hand(hand);
  if (hand_info == null) {
    // Illegal hand.
    return r(false, 'invalid-card-set');
  }

  // TODO(joywzhang): yes?
  console.log("can users play bomb on lead????");

  // You can play if it's your turn, or you BOMB.
  console.log(player_id);
  console.log(this.next_player_id);
  if (player_id != this.next_player_id && hand_info.type != 'BOMB') {
    return r(false, 'out-of-turn');
  }

  // You can play your cards if you have lead, or if your cards are higher over prev cards.
  if (!this.cards_played.is_new_trick() &&
      !tichu_logic.is_playable_over(hand, this.cards_played.get_last_hand_played_in_current_trick())) {
    return r(false, 'cards-too-low');
  }

  // If Mahjong played, set mahjong_choice.
  if (hand.length == 1 && hand[0].suit == "Mahjong" && mahjong_choice != undefined) {
    this.mahjong_wish_outstanding = mahjong_choice;
    this.cards_played.play(player_id, hand);
    this.players[player_id].remove_cards(hand);
    this.increment_next_player_id(1);
    this.advance_game_stage(GAME_ON);
    return r(true);
  }

  // If mahjong wish is outstanding and isn't fulfilled yet...
  // If player CAN satisfy mahjong wish... but doesn't, return false.
  if (this.mahjong_wish_outstanding != null && this.mahjong_wish_outstanding != undefined) {
    var hand_to_beat = this.cards_played.get_last_hand_played_in_current_trick();
    var can_satisfy_mahjong_wish = tichu_logic.can_satisfy_mahjong_wish(
          hand_to_beat, this.players[player_id].hand, this.mahjong_wish_outstanding);

    if (tichu_logic.does_satisfy_mahjong_wish(hand, this.mahjong_wish_outstanding)) {
      this.mahjong_wish_outstanding = null;
    }

    if (can_satisfy_mahjong_wish && this.mahjong_wish_outstanding) {
      return r(false, 'mahjong-wish-required');
    }
  }

  this.cards_played.play(player_id, hand);
  this.players[player_id].remove_cards(hand);
  this.next_player_id = player_id;
  this.increment_next_player_id(1);

  if (this.players[player_id].hand.length == 0) {
    // player_id ran out of cards...
    this.players_who_are_out.push(player_id);
  }

  if (this.is_game_over()) {
    this.advance_game_stage(GAME_OVER);
  } else {
    this.advance_game_stage(GAME_ON);
  }
  return r(true);
};


TichuGame.prototype.all_players_who_are_still_in_have_recently_passed = function() {
  var passed = this.cards_played.get_last_consecutive_passers();
  for (var i = 0; i < 4; i++) {
    if (!this.players[i].is_out() && !passed[i]) {
      return false;
    }
  }
  return true;
};


TichuGame.prototype.assign_dragon_points = function(player_id, receiver) {
  function r(outcome) {
    var mesg = null;
    if (outcome)
      mesg = "[" + player_id + " successfully assigned dragon points to " + receiver + "!]";
    else
      mesg = "[" + player_id + " failed to assign dragon points to " + receiver + "!]";
    return {outcome: outcome, mesg: mesg};
  }

  if (this.cards_played.was_last_winner_dragon() &&
      this.cards_played.winner_of_last_trick() == player_id) {
    this.players[receiver].add_points(
      this.cards_played.sum_points_of_latest_trick());
    this.increment_next_player_id(0);
    this.cards_played.start_new_round();
    this.advance_game_stage(GAME_ON);
    return r(true);
  }
  return r(false);
}

TichuGame.prototype.get_client_state = function(player_id) {
  var client_state = {};

  client_state.player_hand = this.players[player_id].get_players_hand();

  client_state.current_game_stage = this.game_stage;
  client_state.current_trick = this.cards_played.current_trick();

  client_state.current_points = [];
  for (var i = 0; i < this.players.length; i++) {
    client_state.current_points.push(this.players[i].points);
  }

  client_state.num_cards_in_hand = [];
  for (var i = 0; i < this.players.length; i++) {
    client_state.num_cards_in_hand.push(this.players[i].get_num_cards_in_hand());
  }

  client_state.tichu_state = this.players[player_id].tichu_state;

  //console.log(this.cards_passed_buffer);

  client_state.cards_already_passed = this.cards_passed_buffer[player_id];

  if (this.game_stage == DRAGON_PASS_INTERLUDE) {
    client_state.dragon_master = this.dragon_master;
  }

  client_state.mahjong_wish_outstanding = this.mahjong_wish_outstanding;

  client_state.next_player_id = this.next_player_id;

  //console.log("client_state");
  //console.log(client_state);

  return client_state;
};

exports.TichuGame = TichuGame