var tichu_logic = require("./tichu_logic");

// enum: this.tichu_state
var NO_STATUS = 0;
var GRAND_YES = 1;
var GRAND_NO = 2;
var TICHU_YES = 3;
var TICHU_NO = 4;


var TichuPlayer = function(player_id) {
  console.log("new TichuPlayer");
  this.player_id = player_id;
  this.hand = [];
  this.points = 0;
  this.tichu_state = NO_STATUS;
};

// returns true if saying Yes/No grand tichu makes sense.
TichuPlayer.prototype.grand_tichu = function(do_grand_tichu) {
  if (this.tichu_state == NO_STATUS && this.hand.length == 8) {
    this.tichu_state = (do_grand_tichu ? GRAND_YES : GRAND_NO);
    return true;
  }
  return false;
};

TichuPlayer.prototype.is_out = function() {
  return this.hand.length == 0;
};

TichuPlayer.prototype.tichu = function(do_tichu) {
  if ((this.tichu_state == GRAND_NO || this.tichu_state == TICHU_NO) &&
      this.hand.length == 14) {
    this.tichu_state = (do_tichu ? TICHU_YES : TICHU_NO);
    return true;
  }
  return false;
};

TichuPlayer.prototype.add_points = function(delta) {
  this.points += delta;
};

TichuPlayer.prototype.get_players_hand = function() {
  return this.hand;
};

TichuPlayer.prototype.get_num_cards_in_hand = function() {
  if (this.hand == null) return 0;
  return this.hand.length;
};

TichuPlayer.prototype.has_mahjong = function() {  
  for (var i = 0; i < this.hand.length; i++) {
    if (this.hand[i].suit == 'Mahjong') {
      return true;
    }
  }
  return false;
};

// Returns true on success.
TichuPlayer.prototype.add_cards = function(cards) {
  //console.log("attempt add card", cards);
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].val == null || cards[i].suit == null) {
      return false;
    }
    this.hand.push(cards[i]);
  }
  this.hand.sort(tichu_logic.comparator);
  return true;
};


// Returns true on success.
TichuPlayer.prototype.remove_single_card = function(card) {
  for (var i = 0; i < this.hand.length; i++) {
    // For phoenix, we don't require the value to match... since phoenix is special
    if (card.suit == "Phoenix" && this.hand[i].suit == "Phoenix") {
      this.hand.splice(i,1);
      return true;
    }
    if (card.val == this.hand[i].val && card.suit == this.hand[i].suit) {
      this.hand.splice(i,1);
      return true;
    }
  }
  return false;
};

// Returns true on success.
TichuPlayer.prototype.remove_cards = function(cards) {
  //console.log("attempt remove card", cards);
  for (var i = 0; i < cards.length; i++) {
    // For each card played, remove it from the player's hand.
    if (!this.remove_single_card(cards[i])) {
      return false;
    }
  }
  this.hand.sort(tichu_logic.comparator);
  return true;
};

exports.TichuPlayer = TichuPlayer;