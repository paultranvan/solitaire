var types = require('./types.js');
var express = require('express');
var http = require('http');

var app = express();


/* Problemes
_ gestion du clic
_ comment déplacer une carte, ou un groupe de carte? 
*/

var port = process.env.PORT || 8080;
var host = process.env.HOST || "127.0.0.1";
var nCards = 52;
var imageBackPath = "card_back.png";

var cards = [];
var deck_cards = [];
//ces 2 tableaux sont a utiliser notamment pour le déplacement auto des cartes quand on clic dessus depuis la donne.
var foundation_last_cards = []; //tableau de 4 cases, chacune correspondant à la dernière carte placée pour sa couleur
var plateau_cards = []; //tableau de cartes pouvant être jouées, c'est à dire celles du tableau

//this is needed to access the images
app.use(express.static(__dirname + '/classic-cards'));

app.get('/solitaire', function(req, res) 
{
	cards = create52Cards();
	var imagesPath = [];
	for(var i=0;i<nCards;i++)
		imagesPath.push(cards[i].imagePath);
    res.render('solitaire.ejs', {nCards: nCards, imgPath: imagesPath, imgBack: imageBackPath});
});


// Starts the server itself
var server = http.createServer(app).listen(port, host, function() {
  console.log("Server listening to %s:%d within %s environment",
              host, port, app.get('env'));
});

/*var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
    console.log('Un client est connecté !');
	
	socket.on('get_card', function(){
	});
};
*/


function create52Cards()
{
	var cards_array = [];
	
	
	//for each type of card (spade, club...)
	for(var i = 0; i < 4; i++)
	{
		//for each number (1 to 13)
		for(var j = 1; j <= nCards/4 ; j++)
		{
			var imgName;
			switch(i)
			{
				case types.TYPE.SPADE:
					imgName = "spade_" + j + ".png";
					break;
				case types.TYPE.CLUB:
					imgName = "club_" + j + ".png";
					break;
				case types.TYPE.DIAMOND:
					imgName = "diamond_" + j + ".png";
					break;
				case types.TYPE.HEART:
					imgName = "heart_" + j + ".png";
					break;
				//TODO : trow new error
				default:
					imgName = "";
					break;
			}
				
			var position = new types.POSITION(0, 0);
			
			var card = new types.CARD(j, i, types.SIZE, types.POSITION, imgName);
			cards_array.push(card);
		}
	}
	
	return cards_array;
}

//to be called after a click handler
//find how to do an actionListener on an object in js
function select_card(x, y)
{
}
	
function check_card_move(card)
{
	var associate_card = find_closest_card(card.pos.x, card.pos.y);
	if(associate_card == null)
		return false;

	//checks if the card can be places on the associate card
	return check_prev_card(associate_card);
}

//warning : dissocier la recherche dnas le tableau des cartes fondations : pas la meme verif de distance
function find_closest_card(x, y)
{
	//need an array containing all the placed cards.
	tab_pos_placed_cards.forEach (function(card)
	{
		if(abs(card.pos.x -  x) < DISTANCE_MAX_X && y - card.pos.y < DISTANCE_MAX_Y && y -pos > 0)
			return c;
	});
	return null;
}

function check_prev_card(prev_card, card)
{
	var is_foundation = check_card_is_foundation(prev_card);
	var is_plateau = check_card_is_plateau(prev_card);
	
	if(is_plateau)
		return( prev_card.number == card.number + 1 && prev_card.color != card.color );
	else if(is_foundation)
		return( prev_card.number == card.number - 1 && prev_card.type == card.type );
}

function check_card_is_foundation(prev_card)
{
	for(var i=0; i<4; i++)
	{
		if(foundation_last_cards[i] == prev_card)
			return true;
	}
	return false;
}

function check_card_is_plateau(prev_card)
{
	for(var i=0; i<tableau.length; i++)
	{
		if(tableau[i] == prev_card)
			return true;
	}
	return false;
}

//callback
function win()
{
	if(deck_cards.length == 0 && playable_cards.length == 0)
		return true;
	return false;
}




