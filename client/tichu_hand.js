// COPIED FROM TICHU_LOGIC
// Compare cards. Sort by value, then by suit.
// 2,3,4,...,J,Q,K,A,Dog,Dragon,Mahjong,Phoenix
function comparator(a, b) {
  if (a.val == b.val) {
    if (a.suit == b.suit) return 0;
    return (a.suit > b.suit) ? 1 : -1;
  }
  return a.val - b.val;
}

function is_trump (item) {
  return (trumps_to_html_unicode[item] != undefined);
}

function cards_equal(a, b) {
  return (a.suit == b.suit && a.val == b.val);
}

function hash_card(card) {
  return card.val + '|' + card.suit;
}


// enum: this.tichu_state (from tichu_player.js)
var NO_STATUS = 0;
var GRAND_YES = 1;
var GRAND_NO = 2;
var TICHU_YES = 3;
var TICHU_NO = 4;


/************************************************************************************/

var suits_to_html_unicode = {
  "Diamond" : "&#9830;",
  "Club" : "&#9827;",
  "Heart" : "&#9829;",
  "Spade" : "&#9824;"
};

var trumps_to_html_unicode = {
  "Mahjong" : "&#x5c07;",
  "Dog" : "&#x72ac;",
  "Phoenix" : "&#x51e4;",
  "Dragon" : "&#x9f99;",
};
/************************************************************************************/

var DisplayCard = function(card, opts) {
  if (!opts) opts = {};

  this.card = card;
  this.selected = (opts.selected === undefined ? false : opts.selected);
  this.passed = (opts.passed === undefined ? false : opts.passed);

  this.elt = DisplayCard.make_elt(this.card, true);
  this.elt.click(this._handle_click.bind(this));

  this.set_passed(this.passed);
  this.set_selected(this.selected);
};

// static
DisplayCard.make_elt = function(card, show_card_inputs) {
  var ret = $('<span>');
  //ret.addClass('tichu-card');
  if (is_trump(card.suit)) {
    ret.css('color', '#0066CC');
    ret.html(card.suit + trumps_to_html_unicode[card.suit]);
    if (card.suit == "Phoenix" && show_card_inputs) {
      //ret.append($('<input>').attr("class", "phoenixinput").attr("maxlength",2).attr("size",2));
    }
    if (card.suit == "Mahjong" && show_card_inputs) {
      //ret.append($('<input>').attr("class", "mahjonginput").attr("maxlength",2).attr("size",2));
    }
    return $('<div>').addClass('tichu-card').append(ret);
  }
  var card_val_str = "";
  // Add a little icon for the suit!
  if (card.val == 14) card_val_str = "A";
  else if (card.val == 13) card_val_str = "K";
  else if (card.val == 12) card_val_str = "Q";
  else if (card.val == 11) card_val_str = "J";
  else card_val_str = card.val;
  card_val_str += suits_to_html_unicode[card.suit];

  var color = (card.suit == "Heart" || card.suit == "Diamond" ? '#FF0000' : '#000000');
  ret.css('color', color);
  ret.html(card_val_str);
  return $('<div>').addClass('tichu-card').append(ret);
};

DisplayCard.prototype.set_passed = function(status) {
  if (this.passed === status)
    return;
  if (status) {
    this.elt.addClass('selected-card-to-pass');
    this.set_selected(false);
  } else {
    this.elt.removeClass('selected-card-to-pass');
  }
  this.passed = status;
};

DisplayCard.prototype.set_selected = function(status) {
  this.selected = status;
  if (this.selected)
    this.elt.addClass('selected-card');
  else
    this.elt.removeClass('selected-card');
};

DisplayCard.prototype.get_elt = function() {
  return this.elt;
};

DisplayCard.prototype._handle_click = function() {
  if (this.passed)
    return;
  this.set_selected(!this.selected);
};



var TichuHand = function(hand, container_div) {
  console.log("new TichuHand");
  this.hand = hand;
  this.container_div = container_div;

  this.arrangeable_list = new ArrangeableList({
      width: 80,
      height: 50
  });

  this.container_div.append(this.arrangeable_list.elt());

  this.displayed_cards = {};
  this._update_displayed_cards();
};

TichuHand.prototype._update_displayed_cards = function() {
    var new_disp_cards = {};
    for (var i = 0; i < this.hand.length; i++) {
        var hash = hash_card(this.hand[i]);
        if (this.displayed_cards[hash]) {
            new_disp_cards[hash] = this.displayed_cards[hash];
        } else {
            new_disp_cards[hash] = new DisplayCard(this.hand[i]);
            var len = this.arrangeable_list.length();
            this.arrangeable_list.insert(len, new_disp_cards[hash].get_elt());
        }
    }

    for (var hash in this.displayed_cards) {
        if (!new_disp_cards[hash]) {
            var to_remove = this.displayed_cards[hash].get_elt();
            this.arrangeable_list.remove(to_remove);
        }
    }

    this.displayed_cards = new_disp_cards;
};

TichuHand.prototype._get_display_card = function(card) {
  return this.displayed_cards[hash_card(card)];
};


// Unselects all new cards.
TichuHand.prototype.update_hand = function(new_hand, cards_passed, game_stage) {
  console.log("update hand if different");

  this.hand = new_hand;
  this._update_displayed_cards();
//  this._refresh_card_view();

  if (game_stage == PASSING_3) {
    for (var i = 0; i < cards_passed.length; i++) {
      var card = cards_passed[i];
      if (card) {
        this._get_display_card(card).set_passed(true);
      }
    }
  }
};

TichuHand.prototype.get_selected_cards = function() {
  var selected_cards = [];
  for (var i = 0; i < this.hand.length; i++) {
    var disp_card = this._get_display_card(this.hand[i]);
    if (disp_card.selected) {
      selected_cards.push(this.hand[i]);
    }
  }
  return selected_cards;
};

/*
TichuHand.prototype._refresh_card_view = function() {
  this.container_div.children().detach(); // can't empty b/c it clobbers click handlers
  for (var i = 0; i < this.hand.length; i++) {
    var disp_card = this._get_display_card(this.hand[i]);
    this.container_div.append(disp_card.get_elt());
  }
};
*/