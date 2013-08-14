

/* enum start for game stage! */
var DEALT_8 = 0; // Right after 8 cards are dealt. GRAND TICHU ALLOWED.
var DEALT_14 = 1; // After 14 cards are dealt. TICHU ALLOWED.
var PASSING_3 = 2; // During the selection of 3 cards to pass. TICHU NOT ALLOWED.
var GAME_ON = 3; // Game has started. MAHJONG player must start.
var DRAGON_PASS_INTERLUDE = 4; // Dragon just won a trick (after 4'th pass) - wait on points passing decision.
var GAME_OVER = 5; // Game over... 3 players out of cards - or 1-2 happened.
/* enum end */

// enum: this.tichu_state (from tichu_player.js)
var NO_STATUS = 0;
var GRAND_YES = 1;
var GRAND_NO = 2;
var TICHU_YES = 3;
var TICHU_NO = 4;

/************************************************************************************/
var player_id = null;
var tid = null;
var tichu_hand; // my tichu hand

var player_tichu_state = NO_STATUS;

// all players' data
var game_stage = -1;
var chats = [];
var current_trick = [];
var current_points = [];
var num_cards_in_hand = [];
var cards_already_passed = [];
var dragon_master = -1;
var mahjong_wish_outstanding = null;
var next_player_id = -1;

var user_info = [null, null, null, null];

var clone = function(item) {
  return JSON.parse(JSON.stringify(item));
}

var display_chats = function() {
  var chat_str = "";
  for (var i = 0; i < chats.length; i++) {
    var coloredstr = chats[i];
    if (chats[i][0] == player_id.toString()) {
      coloredstr = "<font color='#0000FF'>" + coloredstr + "</font>";
    }
    chat_str += coloredstr + "<br />";
  }
  $("#chatdiv").html(chat_str);
  var elem = document.getElementById('chatdiv');
  elem.scrollTop = elem.scrollHeight;
};

var display_player_info = function(player_id, friend_or_foe_tag){
  var player_div = $(friend_or_foe_tag);
  player_div.empty();

  var player_name = "No one here.";
  if (user_info[player_id])
    player_name = user_info[player_id].first_name + " " + user_info[player_id].last_name;
  player_div.append(
    $("<button>").attr("class", "unclickable").html(player_name));

  player_div.append(
    $("<button>").attr("class", "unclickable").html("player_id: " + player_id.toString()));
  player_div.append(
    $("<button>").attr("class", "unclickable").html("cards in hand: " + num_cards_in_hand[player_id].toString()));
  player_div.append(
    $("<button>").attr("class", "unclickable").html("points: " + current_points[player_id].toString()));
};

var display_table = function() {
  var table_div = $("#table_div");
  table_div.empty();

  if (player_id >= 0 && player_id == next_player_id) {
    table_div.append("It's your turn!<br>");
  }

  if (mahjong_wish_outstanding) {
    table_div.append("Mahjong wish outstanding: " + mahjong_wish_outstanding + "<br><br>");
  }
  for (var i = 0; i < current_trick.length; i++) {
    table_div.append(current_trick[i].player_id + " : ");
    for (var j = 0; j < current_trick[i].hand.length; j++) {
      table_div.append(DisplayCard.make_elt(current_trick[i].hand[j], false /* show_card_inputs */));
    }
    table_div.append("<br>");
  }

  if (game_stage == GAME_OVER) {
    table_div.append("players 0 & 2's sum of scores:  " + (current_points[0] + current_points[2]) + "<br>");
    table_div.append("players 1 & 3's sum of scores:  " + (current_points[1] + current_points[3]) + "<br>");
  }
};

var action_click_handler = function() {
    console.log("action");
    var action_name = $(this).attr("class");
    var id = $(this).attr("id");
    console.log(action_name);

    // TODO(joy): phoenix_choice may be undefined... if player doesn't have phoenix (ever/anymore)

    var cards_selected = tichu_hand.get_selected_cards();
    var phoenix_choice = null, mahjong_choice = null;

    var send_action = function() {
        console.log("phoenix choice", phoenix_choice);
        console.log("mahjong choice", mahjong_choice);
        $ajax("/table/" + tid + "/action", {
            tid: tid,
            player_id: player_id,
            action_name: action_name,
            id: id,
            cards_selected: cards_selected,
            phoenix_choice: phoenix_choice,
            mahjong_choice: mahjong_choice
        }, 'post', function(err, res) {
            if (err)
                console.log("response ", res);
            else
                console.log("action success");
        });
    };

    if (action_name == 'play') {
        var modal = $('<div>').addClass('play-modal').css({
            'background-color': '#FFFFFF',
            'border': 'solid 2px',
            'border-radius': '4px'
        });
        var need_modal = false;
        for (var i = 0; i < cards_selected.length; i++) {
            var card = cards_selected[i];
            if (card.suit == 'Phoenix') {
                modal.append($('<span>Phoenix value: </span><input maxlength=2 id="phoenix-choice" />'))
                need_modal = true;
            }
            if (card.suit == 'Mahjong') {
                modal.append($('<span>Mahjong call: </span><input maxlength=2 id="mahjong-choice" />'))
                need_modal = true;
            }
        }

        if (need_modal) {
            var click_blocker = $('<div>').css({
                'position': 'fixed',
                'top': 0,
                'left': 0,
                'right': 0,
                'bottom': 0,
                'z-index': 999,
                'opacity': 0.3,
                'background-color': 'black'
            });
            $(document.body).append(click_blocker);

            modal.append($('<button>OK</button>').click(function() {
                modal.dialog('close');
            }));
            modal.dialog({
                draggable: false,
                modal: true,
                dialogClass: 'no-close',
                close: function(evt, ui) {
                    click_blocker.remove();
                    phoenix_choice = $('#phoenix-choice').val();
                    mahjong_choice = $('#mahjong-choice').val();
                    send_action();
                }
            });
            modal.css({
                'position': 'fixed',
                'top': '50%',
                'left': '50%',
                'right': '50%',
                'bottom': '50%',
                'margin-top': -modal.height()/2,
                'margin-left': -modal.width()/2,
                'margin-right': -modal.width()/2,
                'margin-bottom': -modal.height()/2,
                'z-index': 1000 // TODO: hack to bring z-index to front
            });
            return;
        }
    }

    var mahjong_choice = $("input.mahjonginput").val();
    console.log("phoenix choice", phoenix_choice);
    console.log("mahjong choice", mahjong_choice);

    var action = {name: action_name}
    if (action_name == 'grandtichu') {
        action.call = (id == 'yes');
    } else if (action_name == 'tichu') {
        action.call = (id == 'yes');
    } else if (action_name == 'play') {
        action.cards = cards_selected;
        action.phoenix_choice = phoenix_choice;
        action.mahjong_choice = mahjong_choice;
    } else if (action_name == 'pass_card') {
        action.cards = cards_selected;
        action.receiver = id;
    } else if (action_name == 'assign_dragon_points') {
        action.receiver = id;
    }

    $ajax("/table/" + tid + "/action", {
        action: action,
        player_id: player_id
    }, 'post', function(err, res) {
        if (err)
            console.log("response ", res);
        else
            console.log("action success");
    });
};

var display_actions = function() {
  var actions_str = "";
  var buttons = [];
  console.log(player_tichu_state);
  console.log("game_stage", game_stage);

  if (game_stage == DEALT_8) {
    if (player_tichu_state == NO_STATUS) {
      buttons.push(
        $("<button>").attr("class", "grandtichu").attr("id","yes").html("grand tichu!"));
      buttons.push(
        $("<button>").attr("class", "grandtichu").attr("id","no").html("nah."));
    } else {
      buttons.push("Waiting on others to decide whether/not to grand tichu");
    }
  }

  if (game_stage == DEALT_14) {
    if (player_tichu_state == GRAND_YES) {
      buttons.push("You already granded... waiting on pass to begin.");
    }
    if (player_tichu_state == GRAND_NO) {
      buttons.push(
        $("<button>").attr("class", "tichu").attr("id","yes").html("tichu before pass!"));
      buttons.push(
        $("<button>").attr("class", "tichu").attr("id","no").html("nah."));
    }
    if (player_tichu_state == TICHU_YES || player_tichu_state == TICHU_NO) {
      buttons.push("Waiting on others to decide whether/not to tichu before pass.");
    }
  }

  if (game_stage == PASSING_3) {
    console.log("PASSING 3");
    console.log(cards_already_passed);

    var directions = [null, "left", "across", "right"];

    for (var i = 1; i < 4; i++) {
      var receiver = (player_id + i) % 4;
      if (cards_already_passed[receiver] == null) {
        buttons.push(
          $("<button>").attr("class", "pass_card").attr("id",receiver).html("pass " + directions[i] + " to player " + receiver));
      }
    }
  }

  if (game_stage == GAME_ON || game_stage == DRAGON_PASS_INTERLUDE) {
    if (tichu_hand.hand.length == 14 && player_tichu_state == TICHU_NO) {
      buttons.push(
        $("<button>").attr("class", "tichu").attr("id","yes").html("tichu after the pass!"));
    }

    if (tichu_hand.hand.length > 0) {
      buttons.push(
        $("<button>").attr("class", "play").html("play!"));
      buttons.push(
        $("<button>").attr("class", "pass").html("pass!"));
    }
  }

  if (game_stage == DRAGON_PASS_INTERLUDE && player_id == dragon_master) {
    buttons.push(
      $("<button>").attr("class", "assign_dragon_points").attr("id", (player_id + 1) % 4).html("give points to left!"));
    buttons.push(
      $("<button>").attr("class", "assign_dragon_points").attr("id", (player_id + 3) % 4).html("give points to right!"));
  }

  var action_div = $("#action_div");
  action_div.empty();
  for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    if (typeof button !== 'string')
      button.click(action_click_handler);
    action_div.append(button);
  }
};

var refresh_view_and_reattach_handlers = function() {
  display_chats();
  display_actions();
  display_table();

  display_player_info(player_id, "#self0");
  display_player_info((player_id + 1) % 4, "#foe1");
  display_player_info((player_id + 2) % 4, "#friend2");
  display_player_info((player_id + 3) % 4, "#foe3");
};

/************************************************************************************/

  var submit_chat = function (player_chat) {
    $.ajax({
     url: "/table/" + tid + "/chat",
     type: "post",
     contentType : "application/json",
     data: JSON.stringify({
       'player_id' : player_id,
       'player_chat' : player_chat,
       }),
     success: function(response){
       console.log("action success");
    },
    error: function(response) {
     console.log("response ", response);
   },
 });
};
/************************************************************************************/

window.onload = function() {
    player_id = TEMPLATE_PARAMS.player_id;
    tid = TEMPLATE_PARAMS.tid;

    $("button#leave-table-button").click(function() {
        $ajax('/table/' + tid + '/kick', {
            player_id: player_id
        }, 'post', function(err, res) {
            if (res === 'ok') {
                window.location.href = '/';
            } else {
                console.log('Failed to kick:', res);
            }
        });
    });

    $("button#logout-button").click(function() {
        window.location.href = '/logout';
    });

    console.log("WELCOME, PLAYER " + player_id);
    tichu_hand = new TichuHand([], $("#hand_div"));

    function handle_data(res_data) {
        console.log("=========\nhandle data!");
        game_stage = res_data.current_game_stage;
        chats = res_data.chats;
        current_trick = res_data.current_trick;
        current_points = res_data.current_points;
        num_cards_in_hand = res_data.num_cards_in_hand;
        player_tichu_state = res_data.tichu_state;
        cards_already_passed = res_data.cards_already_passed;
        dragon_master = res_data.dragon_master;
        mahjong_wish_outstanding = res_data.mahjong_wish_outstanding;
        next_player_id = res_data.next_player_id;

        tichu_hand.update_hand(res_data.player_hand, res_data.cards_already_passed, game_stage);
        console.log(game_stage);
        refresh_view_and_reattach_handlers();
    }

    var lpc = new LongPollClient(player_id, '/table/' + tid + '/poll');
    lpc.register_handler(tid + ':table', -1, handle_data);
    lpc.register_handler(tid + ':users', -1, function(data) {
        for (var i = 0; i < data.users.length; i++) {
            user_info[i] = data.users[i];
        }
        // owner uid is data.owner
        refresh_view_and_reattach_handlers();
    });
    lpc.run();

    $("input#chatinput").keyup(function(e) {
        // If enter key:
        if (e.keyCode == 13) {
            var player_chat = $("input#chatinput").val();
            submit_chat(player_chat);
            $("input#chatinput").val("");
        }
    });
};