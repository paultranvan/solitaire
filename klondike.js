/****************************************************************************************
               Script to create a working game of solitaire (Klondike)
                     Written by Mark Wilton-Jones, 20-29/12/2005
*****************************************************************************************

Please see http://www.howtocreate.co.uk/jslibs/ for details and a demo of this script
Please see http://www.howtocreate.co.uk/tutorials/jsexamples/solitaire.html for detailed instructions
Please see http://www.howtocreate.co.uk/jslibs/termsOfUse.html for terms of use
_____________________________________________________________________________________________________*/

/****************************
 The main card game handlers
****************************/

function solitaireGame(oUniqueName,oWorkspace,oDeck,oWastePile,oFoundation,oTableau,oCardWord,oCardNames,oSuits,youWin,oDeal,oOptions,
	prefDone,prefCanc,prefName,imgPref,dealPref,cardPref,backPref,deal1,deal3) {

	// Check for invalid configuration
	if( !window.playingCard ) { return; } // Already covered earlier
	if( !this.throwError ) {
		solitaireGame.prototype.throwError('SolitaireIncorrectCall','You must use the \'new\' keyword when creating a game of solitaire.');
	}
	if( !document.getElementById || !document.childNodes || !document.createElement || !document.createElement('div') ) {
		this.throwError('SolitaireBrowserNotGoodEnough','The browser you are using does not have high enough DOM support to play solitaire.',true);
	}
	if( !oUniqueName || ( typeof(oUniqueName) != typeof('') ) || solitaireGame.prototype.gameList[oUniqueName] ) {
		this.throwError('SolitaireNoUniqueName',(solitaireGame.prototype.gameList[oUniqueName]?('Attempted to reuse the name: '+oUniqueName+'\n'):'')+
			'You must specify a unique name when creating a solitaire game.');
	}
	if( !oWorkspace || ( oWorkspace.nodeType != 1 ) ) {
		this.throwError('SolitaireNoWorkspaceParent','You must specify a parent element when creating a solitaire game.\nThe element must exist before you create the solitaireGame object.\nIf needed, use an onload listener, and use that to create the game.');
	}
	if( arguments.length > 2 ) {
		for( var i = 2, oStr = typeof(''); ( i < arguments.length ) && ( i < 21 ); i++ ) {
			if( ( i != 7 ) && ( i != 8 ) && arguments[i] && typeof(arguments[i]) != oStr ) {
				this.throwError('SolitaireInvalidString','Expected a string as parameter '+(i+1)+' when creating a solitaire game.');
			} else if( ( ( i == 7 ) || ( i == 8 ) ) && arguments[i] ) {
				if( ( typeof( arguments[i] ) != typeof([]) ) || ( arguments[i].length < ((i==7)?13:4) ) ) {
					this.throwError('SolitaireInvalidString','Expected an array containing '+((i==7)?'thirteen':'four')+' strings as parameter '+(i+1)+' when creating a solitaire game.');
				}
				for( var n = 0; n < ((i==7)?13:4); n++ ) {
					if( !arguments[i][n] || ( typeof(arguments[i][n]) != oStr ) ) {
						this.throwError('SolitaireInvalidString','Expected a string as entry '+(n+1)+' of the array passed as parameter '+(i+1)+' when creating a solitaire game.');
					}
				}
			}
		}
	}

	// Prepare the cards
	solitaireGame.prototype.gameList[oUniqueName] = this;
	this.name = oUniqueName;
	this.cheatsAllowed = true;
	this.cards = new cardSet();
	this.cards.setCardNames(oCardWord,oCardNames);
	this.cards.create52Cards(oSuits)
	this.cardStacks = [];
	this.cardStacks[0] = new cardStack(0,0,true,oDeck?oDeck:'Deck');
	this.cardStacks[1] = new cardStack(1,1,true,oWastePile?oWastePile:'Waste pile');
	for( var i = 2; i < 6; i++ ) {
		this.cardStacks[i] = new cardStack(2,i,true,oFoundation?oFoundation:'Foundation');
	}
	for( var i = 6; i < 13; i++ ) {
		this.cardStacks[i] = new cardStack(3,i,true,oTableau?oTableau:'Tableau');
	}
	this.dealNum = ( this.solitairepref[this.name+'deal'] == '3' ) ? 3 : 1;

	this.strings = {};
	this.strings.youWin = youWin ? youWin : 'Congratulations, you won! Deal again?';
	this.strings.prefDone = prefDone ? prefDone : 'Done';
	this.strings.prefCanc = prefCanc ? prefCanc : 'Cancel';
	this.strings.prefName = prefName ? prefName : 'Options';
	this.strings.imgPref = imgPref ? imgPref : 'Images for size ';
	this.strings.dealPref = dealPref ? dealPref : 'Dealing';
	this.strings.cardPref = cardPref ? cardPref : 'Card set:';
	this.strings.backPref = backPref ? backPref : 'Image back:';
	this.strings.deal1 = deal1 ? deal1 : 'Deal 1';
	this.strings.deal3 = deal3 ? deal3 : 'Deal 3';

	// Set up handlers
	for( var i = 0; i < this.cards.playingCards.length; i++ ) {
		this.cards.playingCards[i].game = this;
		this.cards.playingCards[i].representation.onmousedown = this.handleMousedownOnCards;
		this.cards.playingCards[i].representation.onclick = this.handleClicksOnCards;
		this.cards.playingCards[i].representation.ondblclick = this.handleDoubleClicksOnCards;
		this.cards.playingCards[i].representation.ondragstart = function () { return false; };
		if( window.opera ) {
			// Make spatnav work better
			// Still not perfect since it has trouble selecting the right elements with them all so close together
			this.cards.playingCards[i].representation.onfocus = function () {
				if( this.relatedObject == this.relatedObject.cardStack.cardsInStack[this.relatedObject.cardStack.cardsInStack.length-1] ||
					( this.relatedObject.cardStack.type == 3 && this.wayup ) ) {
					this.style.border = '1px solid #ff0';
					this.style.margin = '-1px 0px 0px -1px';
				}
			};
			this.cards.playingCards[i].representation.onblur = function () { this.style.border = ''; this.style.margin = ''; };
		}
	}
	for( var i = 0; i < this.cardStacks.length; i++ ) {
		this.cardStacks[i].game = this;
		this.cardStacks[i].hotspot.onclick = this.handleClicksOnHotspots;
	}

	// Produce a div with known size, so we can always guarantee that the parent element is a parent container
	this.workspace = document.createElement('div');
	this.workspace.style.position = 'relative';
	this.workspace.className = 'workspace';
	// Give it some initial content so IE 5.x can get the offsetWidth right
	this.workspace.appendChild(document.createTextNode(' '));
	if( navigator.product == 'Gecko' && navigator.taintEnabled && !this.cardStacks.filter ) {
		// Firefox 1.0 does not treat text nodes as content
		this.workspace.appendChild(document.createElement('br'));
		this.workspace.appendChild(document.createTextNode(' '));
	}
	oWorkspace.appendChild(this.workspace);

	// Buttons to activate prefs, and re-deal
	var relatedGame = this;
	this.prefsButs = document.createElement('div');
	this.prefsButs.style.position = 'absolute';
	this.prefsButs.style.zIndex = '2';
	this.prefsButs.className = 'extrabuttons';
	var dealDiv = document.createElement('div'),
		optDiv = document.createElement('div');
	this.dealimg = document.createElement('img'),
	this.optimg = document.createElement('img');
	this.dealimg.setAttribute('alt',this.dealimg.title = (oDeal?oDeal:'Deal'));
	this.optimg.setAttribute('alt',this.optimg.title = (oOptions?oOptions:'Options'));
	dealDiv.appendChild(this.dealimg);
	optDiv.appendChild(this.optimg);
	this.prefsButs.appendChild(dealDiv);
	if( !( window.ActiveXObject && navigator.platform.indexOf( 'Mac' ) + 1 && window.ScriptEngine && ScriptEngine() == 'JScript' ) && !( window.opera && !window.XMLHttpRequest ) ) {
		// IE Mac will crash if it tries to do this much DOM manipulation
		// Opera 7.x (fixed in 8) does not show the prefs but halts the game
		// There is no workaround, so the options button will simply not appear in IE Mac or Opera 7.x
		this.prefsButs.appendChild(optDiv);
	}
	this.dealimg.style.display = 'block';
	this.optimg.style.display = 'block';
	dealDiv.onclick = function () {
		if( !relatedGame.ondeal || relatedGame.ondeal({type:'deal',target:relatedGame,currentTarget:relatedGame}) ) {
			relatedGame.startGame();
		}
	};
	optDiv.onclick = function () {
		if( !relatedGame.onshowprefs || relatedGame.onshowprefs({type:'showprefs',target:relatedGame,currentTarget:relatedGame,cardSet:relatedGame.usingCards,cardBack:relatedGame.cardBack,dealNum:relatedGame.dealNum}) ) {
			relatedGame.showPrefs();
		}
	};

	// WebCore 1.0 and 1.1 ( currently only affecting OmniWeb) is unable to remove or change outlines
	this.cantDoOutline = !window.ActiveXObject && !navigator.taintEnabled && document.childNodes && !window.XMLHttpRequest;

}

solitaireGame.prototype.gameList = {};

solitaireGame.prototype.throwError = function (oName,oMessage,oSurpress) {
	// Throw an error and alert if needed
	if( !window.hideCardGameErrors && !oSurpress ) { alert('Fatal error: '+oName+'\n\n'+oMessage); }
	throw({name:oName,message:oMessage});
};

solitaireGame.prototype.setCheatMode = function (oMode) { this.cheatsAllowed = oMode; };

solitaireGame.prototype.toString = function () { return '[object solitaireGame: '+this.name+']'; };

solitaireGame.prototype.addImagePack = function (oImageSet,oBackImages,oExtension,oWidth,oHeight,oName) {
	// Used to make life easier for users :)
	if( !window.playingCard ) { return; } // Already covered earlier
	var oStr = typeof(''), oNum = typeof(0), oArr = typeof([]);
	if( typeof( oImageSet ) != oStr ) {
		this.throwError('SolitaireInvalidImagePack','Expected a string as first parameter to addImagePack method.');
	}
	if( typeof( oBackImages ) != oArr || !oArr.length ) {
		this.throwError('SolitaireInvalidImagePack','Expected an array of back images as second parameter to addImagePack method.');
	}
	for( var i = 0; i < oBackImages.length; i++ ) {
		if( typeof( oBackImages[i] ) != oArr || oBackImages[i].length > 2 || typeof( oBackImages[i][0] ) != oStr || typeof( oBackImages[i][1] ) != oStr ) {
			this.throwError('SolitaireInvalidImagePack','Back image number '+(i+1)+' passed to addImagePack method is not in the correct format.\nExpected an array containing two strings.');
		}
	}
	if( typeof( oExtension ) != oStr ) {
		this.throwError('SolitaireInvalidImagePack','Expected a string as third parameter to addImagePack method.');
	}
	if( typeof( oWidth ) != oNum || oWidth < 1 || oWidth != Math.floor( oWidth ) ) {
		this.throwError('SolitaireInvalidImagePack','Expected a positive integer as fourth parameter to addImagePack method.');
	}
	if( typeof( oHeight ) != oNum || oHeight < 1 || oHeight != Math.floor( oHeight ) ) {
		this.throwError('SolitaireInvalidImagePack','Expected a positive integer as fifth parameter to addImagePack method.');
	}
	if( typeof( oName ) != oStr ) {
		this.throwError('SolitaireInvalidImagePack','Expected a string as sixth parameter to addImagePack method.');
	}
	this.cards.imagePacks.addImagePack(oImageSet,oBackImages,oExtension,oWidth,oHeight,oName);
};

solitaireGame.prototype.checkForWinner = function () {
	// Check if all foundation stacks are full
	for( var i = 2; i < 6; i++ ) {
		if( this.cardStacks[i].cardsInStack.length != 13 ) { return; }
	}
	// They won
	this.gameInPlay = false;
	var theGame = this;
	setTimeout(function () {
		if( theGame.ongamewon ) {
			if( theGame.ongamewon({type:'gamewon',target:theGame,currentTarget:theGame}) ) {
				theGame.startGame();
			}
		} else if( confirm(theGame.strings.youWin) ) { theGame.startGame(); }
	},10);
};

solitaireGame.prototype.startGame = function (oInstantWin) {

	// Start or restart a game

	if( !window.playingCard ) { return; } // Already covered earlier
	if( !this.cards.imagePacks.availWidths.length ) {
		this.throwError('SolitaireNoImagePackSpecified','You must specify at least one image pack before starting a game of solitaire.');
	}

	if( this.showingPrefs ) { return; }

	if( this.downOnCard || this.moveOnCard ) {
		this.clearMouseEvents();
	}
	this.doingSpatNav = null;

	// Deal the cards (move them onto the correct stacks)
	for( var i = 0; i < this.cardStacks.length; i++ ) {
		// Reset stacks so it works for re-deal
		this.cardStacks[i].cardsInStack.length = 0;
	}
	for( var i = 0; i < this.cards.playingCards.length; i++ ) {
		// Reset cards so they do not mess up the stack on re-deal
		this.cards.playingCards[i].cardStack = null;
	}
	if( oInstantWin ) {
		// Perform an instant win, for testing purposes
		for( var i = 2, curcard = 0; i < 6; i++ ) {
			for( var j = 0; j < 13; j++ ) {
				this.cards.playingCards[curcard].showFace(true);
				this.cards.playingCards[curcard++].moveToStack(this.cardStacks[i]);
			}
		}
		this.cards.shuffleCards();
	} else {
		this.cards.shuffleCards();
		for( var i = 0, curcard = 0; i < 7; i++ ) {
			for( var j = 0; j < i; j++ ) {
				this.cards.playingCards[curcard].showFace(false);
				this.cards.playingCards[curcard++].moveToStack(this.cardStacks[i + 6]);
			}
			this.cards.playingCards[curcard].showFace(true);
			this.cards.playingCards[curcard++].moveToStack(this.cardStacks[i + 6]);
		// Enable this for debugging
//		for( var j = 0, s = ''; j < this.cardStacks[i + 6].cardsInStack.length; j++ ) { s += '\n'+this.cardStacks[i + 6].cardsInStack[j].number+' '+this.cardStacks[i + 6].cardsInStack[j].suit+' face '+(this.cardStacks[i + 6].cardsInStack[j].wayup?'up':'down'); } alert('stack '+(i+1)+s);
		}
		for( var i = curcard; i < this.cards.playingCards.length; i++ ) {
			this.cards.playingCards[i].showFace(false);
			this.cards.playingCards[i].moveToStack(this.cardStacks[0]);
		}
		// Enable this for debugging
//		for( var j = 0, s = ''; j < this.cardStacks[0].cardsInStack.length; j++ ) { s += '\n'+this.cardStacks[0].cardsInStack[j].number+' '+this.cardStacks[0].cardsInStack[j].suit+' face '+(this.cardStacks[0].cardsInStack[j].wayup?'up':'down'); } alert('undealt deck'+s);
	}

	// Display the cards where they belong
	this.usingCards = null;
	this.setAppropriateSize();

	// Reposition after a resize change (only after they stop, in order to reduce redraw)
	if( !this.resizeFix && this.cards.imagePacks.availWidths.length > 1 ) {
		var obRef = this, resizeTimeout;
		this.resizeFix = function () {
			if( resizeTimeout ) { clearTimeout(resizeTimeout); }
			resizeTimeout = setTimeout(function () {
				obRef.setAppropriateSize();
			},200);
		};
		if( window.addEventListener ) {
			window.addEventListener('resize',this.resizeFix,false)
		} else if( window.attachEvent ) {
			window.attachEvent('onresize',this.resizeFix)
		}
	}

	this.gameInPlay = true;
	if( oInstantWin ) { this.checkForWinner(); }

};

solitaireGame.prototype.setAppropriateSize = function (oNotAgain) {

	if( this.downOnCard || this.moveOnCard ) {
		this.clearMouseEvents();
	}

	// Pick the most appropriate card set
	var availW = this.workspace.offsetWidth;
	var maxWidth = availW / 8;
	var cardSize = this.cards.imagePacks.getFittingImageSize(true,maxWidth);
	var cardPref = this.solitairepref[this.name+'x'+cardSize], usingCards;
	if( cardPref && ( usingCards = this.cards.imagePacks.availCombo[cardPref] ) ) {
		cardPref = cardPref.split('|')[2];
	} else {
		usingCards = this.cards.imagePacks.widths[cardSize][0];
		cardPref = usingCards.backimages[0][0];
	}
	this.workspace.style.height = ( usingCards.height * 4.1 ) + 'px';

	// Try to avoid scrollbars overlapping cards if the window is within a scrollbar's width of a size change
	if( !oNotAgain && ( this.workspace.offsetWidth < availW ) ) {
		this.setAppropriateSize(true);
		return;
	}

	// Avoid recalculating if nothing has changed
	if( this.usingCards == usingCards ) { return; }
	this.usingCards = usingCards;
	this.cardBack = cardPref;

	var fonts = Math.round(usingCards.height/10) + 'px';

	// Set the card stack positions
	this.cardStacks[0].setStyles(Math.round(usingCards.width / 8 ),Math.round(usingCards.height / 10 ),1,usingCards.width+'px',usingCards.height+'px',fonts);
	if( this.cardStacks[0].hotspot.parentNode != this.workspace ) {
		this.workspace.appendChild(this.cardStacks[0].hotspot);
	}
	this.cardStacks[1].setStyles(Math.round(usingCards.width / 4 ) + usingCards.width,Math.round(usingCards.height / 10 ),1,usingCards.width+'px',usingCards.height+'px',fonts);
	if( this.cardStacks[1].hotspot.parentNode != this.workspace ) {
		this.workspace.appendChild(this.cardStacks[1].hotspot);
	}
	for( var i = 2; i < 6; i++ ) {
		this.cardStacks[i].setStyles(( Math.round(usingCards.width / 8 ) * ( i + 2 ) ) + ( usingCards.width * ( i + 1 ) ),Math.round(usingCards.height / 10 ),1,usingCards.width+'px',usingCards.height+'px',fonts);
		if( this.cardStacks[i].hotspot.parentNode != this.workspace ) {
			this.workspace.appendChild(this.cardStacks[i].hotspot);
		}
	}
	for( var i = 6; i < 13; i++ ) {
		this.cardStacks[i].setStyles(( Math.round(usingCards.width / 8 ) * ( i - 5 ) ) + ( usingCards.width * ( i - 6 ) ),Math.round(usingCards.height / 5 ) + usingCards.height,1,usingCards.width+'px',usingCards.height+'px',fonts);
		if( this.cardStacks[i].hotspot.parentNode != this.workspace ) {
			this.workspace.appendChild(this.cardStacks[i].hotspot);
		}
	}
	this.prefsButs.style.left = Math.floor( ( 23 / 8 ) * usingCards.width ) + 'px';
	this.prefsButs.style.top = Math.round( usingCards.height / 10 ) + 'px';
	this.dealimg.style.width = this.optimg.style.width = Math.ceil( usingCards.width / 2 ) + 'px';
	var buttonHeight = Math.ceil( ( 9 / 20 ) * usingCards.height );
	this.dealimg.style.height = this.optimg.style.height = buttonHeight + 'px';
	this.dealimg.src = this.usingCards.imageset + 'deal' + this.usingCards.extension;
	this.optimg.src = this.usingCards.imageset + 'options' + this.usingCards.extension;
	this.optimg.parentNode.style.marginTop = ( usingCards.height - ( 2 * buttonHeight ) ) + 'px';
	this.prefsButs.style.fontSize = fonts;
	if( this.prefsButs.parentNode != this.workspace ) {
		this.workspace.appendChild(this.prefsButs);
	}

	// Set the size and position of each card
	this.cards.setCardSize(usingCards.width+'px',usingCards.height+'px');
	this.cards.setImagePack(usingCards.imageset,cardPref,usingCards.extension);
	for( var i = 0; i < this.cards.playingCards.length; i++ ) {
		this.cards.playingCards[i].wasDragged = false;
		this.cards.playingCards[i].representation.style.fontSize = fonts;
		this.cards.playingCards[i].autoPositionSolitaire();
		if( this.cards.playingCards[i].representation.parentNode != this.workspace ) {
			this.workspace.appendChild(this.cards.playingCards[i].representation);
		}
	}

};

/**********************************
 Aditions to playing card handlers
**********************************/

if( !window.playingCard ) {
	solitaireGame.prototype.throwError('SolitaireCardGameCoreNotAvailable','Could not find the CardGameCore objects.\nThe cardgamecore.js file must be included BEFORE solitaire.js.');
}

playingCard.prototype.autoPositionSolitaire = function () {
	// Set the position of the card stack
	this.representation.style.zIndex = this.positionOnStack + 2;
	if( this.representation.style.opacity && this.representation.style.opacity != '1' ) {
		if( !this.game.cantDoOutline ) {
			this.representation.style.outline = 'none';
		}
		this.representation.style.opacity = '1';
		this.representation.style.MozOpacity = '1';
		this.representation.style.filter = 'alpha(opacity=100)';
		if( this.representation.style.setProperty ) {
			// Safari 1.1
			try { tmpCard.representation.style.setProperty('-khtml-opacity','1'); } catch(e) {}
		}
	}
	this.representation.style.left = this.cardStack.leftPos +
		( ( this.cardStack.type == 1 ) ? Math.round( this.dealNum * ( this.game.usingCards.width / 4 ) ) : 0 ) + 'px';
	this.representation.style.top = this.cardStack.topPos +
		( ( this.cardStack.type == 3 ) ? Math.round( this.positionOnStack * ( this.game.usingCards.height / 10 ) ) : 0 ) + 'px';
};

playingCard.prototype.dragIsStartingSolitaire = function () {
	// Make sure it (and those stacked on top of it) stacks above all other cards when dragging
	this.representation.style.zIndex = 21 + this.positionOnStack;
	if( this.nextOnStack() ) { this.nextOnStack().dragIsStarting(); }
};

playingCard.prototype.dragHasStoppedSolitaire = function () {
	// Reset stacking
	this.autoPositionSolitaire();
	if( this.nextOnStack() ) { this.nextOnStack().dragHasStopped(); }
};

playingCard.prototype.moveToStackIfPossible = function (oStack,oCheat) {
	// Check if the card is allowed to move stacks, move it if possible, and return true if it was permitted
	var currentStack = this.cardStack, canMove = false;
	oCheat = oCheat && this.game.cheatsAllowed;
	if( oStack.type == 2 ) {
		if( this.nextOnStack() ) {}
		else if( ( this.number == 1 ) && ( oStack.cardsInStack.length == 0 ) ) { canMove = true; }
		else if( ( this.number != 1 ) && oStack.cardsInStack.length && ( oStack.cardsInStack[oStack.cardsInStack.length-1].number == this.number - 1 ) && ( oStack.cardsInStack[oStack.cardsInStack.length-1].suit == this.suit ) ) { canMove = true; }
	} else if( oStack.type == 3 ) {
		if( oCheat && ( oStack.cardsInStack[oStack.cardsInStack.length-1] != this ) ) { canMove = true; }
		if( oStack.cardsInStack.length == 0 ) {
			if( this.number == 13 ) { canMove = true; }
			oCheat = false;
		} else {
			if( oStack.cardsInStack[oStack.cardsInStack.length-1].wayup && ( oStack.cardsInStack[oStack.cardsInStack.length-1].number == this.number + 1 ) && ( oStack.cardsInStack[oStack.cardsInStack.length-1].color != this.color ) ) { canMove = true; }
			oCheat = false;
		}
	}

	if( canMove && this.game.onmovecard && !this.game.onmovecard({type:'movecard',target:this,currentTarget:this,relatedTarget:oStack,cheat:(oCheat&&(oStack.type==3))?true:false}) ) {
		canMove = false;
	}

	if( canMove ) {
		var eachCard = this, nextCard;
		while(eachCard) {
			nextCard = eachCard.nextOnStack();
			eachCard.moveToStack(oStack);
			eachCard.autoPositionSolitaire();
			eachCard = nextCard;
		}
		currentStack.truncate();
		if( this.game.doingSpatNav && window.opera ) { this.game.workspace.className += ''; } //outline redraw fix (spatnav only)
		this.game.checkForWinner();
		return true;
	}
	return false;

};

playingCard.prototype.cleanUpSpatNav = function () {
	var tmpEl = this;
	while( tmpEl ) {
		tmpEl.autoPositionSolitaire();
		tmpEl = tmpEl.nextOnStack();
	}
	this.game.doingSpatNav = null;
	if( window.opera ) { this.game.workspace.className += ''; } //outline redraw fix
};

/***************
 Event handlers
***************/

solitaireGame.prototype.handleClicksOnHotspots = function(e) {
	if( !this.relatedObject.game.gameInPlay ) { return; }
	if( this.downOnCard || this.moveOnCard ) {
		this.clearMouseEvents();
	}
	if( this.relatedObject.game.doingSpatNav ) {
		// End a spatnav move attempt 
		if( !e ) { e = window.event; }
		if( !this.relatedObject.game.doingSpatNav.moveToStackIfPossible(this.relatedObject,e.altKey) ) {
			this.relatedObject.game.doingSpatNav.cleanUpSpatNav();
		}
		this.relatedObject.game.doingSpatNav = null;
	} else if( ( this.relatedObject.type == 0 ) && ( this.relatedObject.cardsInStack.length == 0 ) ) {
		// Put cards from the waste pile back on the deck
		if( this.relatedObject.game.onresetdeck && !this.relatedObject.game.onresetdeck({type:'resetdeck',target:this.relatedObject,currentTarget:this.relatedObject,relatedTarget:this.relatedObject.game.cardStacks[1]}) ) { return; }
		for( var i = this.relatedObject.game.cardStacks[1].cardsInStack.length - 1, thisCard; i >= 0; i-- ) {
			thisCard = this.relatedObject.game.cardStacks[1].cardsInStack[i];
			thisCard.showFace(false);
			thisCard.moveToStack(this.relatedObject);
			thisCard.autoPositionSolitaire();
		}
		this.relatedObject.game.cardStacks[1].truncate();
	}
};

solitaireGame.prototype.handleDoubleClicksOnCards = function() {
	// Ensure only the correct cards can be double clicked
	if( !this.relatedObject || !this.relatedObject.game.gameInPlay ) { return; }
	if( this.downOnCard || this.moveOnCard ) {
		this.clearMouseEvents();
	}
	if( this.relatedObject.game.doingSpatNav ) {
		this.relatedObject.game.doingSpatNav.cleanUpSpatNav();
	}
	if( !this.relatedObject.wayup ) { return; }
	if( this.relatedObject != this.relatedObject.cardStack.cardsInStack[this.relatedObject.cardStack.cardsInStack.length-1] ) { return; }
	this.relatedObject.wasDragged = true;
	var relObj = this.relatedObject;
	setTimeout(function () { relObj.wasDragged = false; },20); //in case browser fires dblclick before click
	if( this.relatedObject.cardStack.type == 2 ) { return; }
	var currentStack = this.relatedObject.cardStack;
	for( var i = 2; i < 6; i++ ) {
		if( this.relatedObject.moveToStackIfPossible(this.relatedObject.game.cardStacks[i]) ) { return; }
	}
};

solitaireGame.prototype.handleClicksOnCards = function (e) {

	if( !this.relatedObject.game.gameInPlay ) { return; }

	if( this.relatedObject.game.downOnCard ) {
		this.relatedObject.game.clearMouseEvents();
	} else if( this.relatedObject.game.moveOnCard ) {
		return;
	}

	// Click is generally only important on cards that are at the top of their stack (except with spatnav)
 	var ontop = ( this.relatedObject == this.relatedObject.cardStack.cardsInStack[this.relatedObject.cardStack.cardsInStack.length-1] );
	if( !ontop && ( ( this.relatedObject.cardStack.type != 3 ) || !this.relatedObject.wayup ) ) { return; }

	if( this.relatedObject.game.doingSpatNav ) {
		// End a spatnav move attempt
		if( !e ) { e = window.event; }
		if( !this.relatedObject.game.doingSpatNav.moveToStackIfPossible(this.relatedObject.cardStack,e.altKey) ) {
			this.relatedObject.game.doingSpatNav.cleanUpSpatNav();
		}
		this.relatedObject.game.doingSpatNav = null;
	} else if( ontop && ( this.relatedObject.cardStack.type == 0 ) ) {
		// Dealing cards onto the wastepile
		var eachCard = [
			this.relatedObject,
			( this.relatedObject.cardStack.cardsInStack.length > 1 ) ? this.relatedObject.previousOnStack() : null,
			( this.relatedObject.cardStack.cardsInStack.length > 2 ) ? this.relatedObject.previousOnStack().previousOnStack() : null
		];
		if( this.relatedObject.game.onwastepile && !this.relatedObject.game.onwastepile({type:'wastepile',target:this.relatedObject,currentTarget:this.relatedObject,relatedTarget:this.relatedObject.game.cardStacks[1],threeCards:eachCard,dealNum:this.relatedObject.game.dealNum}) ) { return; }
		for( var i = 0; i < this.relatedObject.game.dealNum; i++ ) {
			if( eachCard[i] ) {
				eachCard[i].dealNum = i;
				eachCard[i].moveToStack(this.relatedObject.game.cardStacks[1]);
				eachCard[i].showFace(true);
				eachCard[i].autoPositionSolitaire();
			}
		}
		this.relatedObject.game.cardStacks[0].truncate();
	} else if( ontop && ( this.relatedObject.wayup == false ) && ( this.relatedObject.cardStack.type == 3 ) ) {
		// Flipping cards over when they reach the top of a tableau
		if( this.relatedObject.game.onflipcard && !this.relatedObject.game.onflipcard({type:'flipcard',target:this.relatedObject,currentTarget:this.relatedObject}) ) { return; }
		this.relatedObject.showFace(true);
	} else {
		if( this.relatedObject.wasDragged ) {
			this.relatedObject.wasDragged = false;
			return;
		}
		// Start a spatnav move attempt 
		this.relatedObject.game.doingSpatNav = this.relatedObject;
		var tmpCard = this.relatedObject;
		while( tmpCard ) {
			if( !this.relatedObject.game.cantDoOutline ) {
				// WebCore 1.0 and 1.1 ( currently only affecting OmniWeb) is unable to remove or change outlines
				tmpCard.representation.style.outline = '2px solid';
			}
			tmpCard.representation.style.opacity = '0.4';
			tmpCard.representation.style.MozOpacity = '0.4';
			tmpCard.representation.style.filter = 'alpha(opacity=40)';
			if( tmpCard.representation.style.setProperty ) {
				// Safari 1.1
				try { tmpCard.representation.style.setProperty('-khtml-opacity','0.4'); } catch(e) {}
			}
			tmpCard = tmpCard.nextOnStack();
		}
		if( window.opera ) { this.relatedObject.game.workspace.className += ''; } //outline redraw fix
	}

};

solitaireGame.prototype.checkBrowserScrollBug = function (oScroll) {
	//compensate for bugs in older versions of current browsers (all now use pageX/Y)
	if( window.navigator.userAgent.indexOf( 'Opera' ) + 1 ) { return 0; }
	if( window.ScriptEngine && ScriptEngine().indexOf( 'InScript' ) + 1 ) { return 0; }
	if( window.navigator.vendor == 'KDE' ) { return 0; }
	return oScroll;
}

solitaireGame.prototype.handleMousedownOnCards = function (e) {

	// Do all the drag/drop stuff - this part is _not_ easy, especially since it must not be confused with clicks
	this.relatedObject.wasDragged = false;
	if( !this.relatedObject.game.gameInPlay ) { return; }
	if( solitaireGame.prototype.downOnSolitaireCard ) { return; }
	if( this.relatedObject.game.doingSpatNav ) { return; }

	// Only the main mouse button can be used for dragging
	if( !e ) { e = window.event; }
	if( !e.which ) { e.which = e.button; }
	if( e.which > 1 ) { return; }
	if( this.relatedObject.game.downOnCard || this.relatedObject.game.moveOnCard ) {
		this.relatedObject.game.clearMouseEvents();
	}

	// Cards that can be dragged are:
	//  - Cards that are on the top of stack types 1 or 2
	//  - Cards that are face up on stack type 3
	var ontop = ( this.relatedObject == this.relatedObject.cardStack.cardsInStack[this.relatedObject.cardStack.cardsInStack.length-1] );

	if( !( ontop && this.relatedObject.cardStack.type && ( this.relatedObject.cardStack.type < 3 ) ) && !( this.relatedObject.wayup && ( this.relatedObject.cardStack.type == 3 ) ) ) { return; }

	// JavaScript limitation - I want to be able to remove listeners from any method, but they run in scope of document.
	// I need to be able to get back into the correct scope without restricting access to the methods (otherwise I could
	// add them into the current scope). So I add an ugly global variable, and make sure that only one solitaire instance
	// uses it at any time. I could not find a better solution.
	solitaireGame.prototype.downOnSolitaireCard = this.relatedObject.game.downOnCard = this.relatedObject;

	var oNum = typeof(0);
	this.relatedObject.eventInformation = [
		( typeof( e.pageX ) == oNum ) ? e.pageX : ( e.clientX + this.relatedObject.game.checkBrowserScrollBug( document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft ) ),
		( typeof( e.pageY ) == oNum ) ? e.pageY : ( e.clientY + this.relatedObject.game.checkBrowserScrollBug( document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop ) ),
		parseInt(this.style.left),
		parseInt(this.style.top)
	];

	if( document.addEventListener ) {
		document.addEventListener('mouseup',this.relatedObject.game.handleMouseupOnCards,false);
		document.addEventListener('mousemove',this.relatedObject.game.handleMousemoveOnCards,false);
	} else if( document.attachEvent ) {
		document.attachEvent('onmouseup',this.relatedObject.game.handleMouseupOnCards);
		document.attachEvent('onmousemove',this.relatedObject.game.handleMousemoveOnCards);
	} else {
		this.relatedObject.game.oldmouseup = document.onmouseup;
		this.relatedObject.game.oldmousemove = document.onmousemove;
		document.onmouseup = this.relatedObject.game.handleMouseupOnCards;
		document.onmousemove = this.relatedObject.game.handleMousemoveOncards;
	}
	if( e.preventDefault ) { e.preventDefault(); }
	e.returnValue = false;
	return false;
	
};

solitaireGame.prototype.clearMouseEvents = function (noRepositioning) {

	if( !this.downOnCard && !this.moveOnCard ) { return; }

	// Put dragged cards in the right place here, only if the action was a move, not a down
	var oCard = this.moveOnCard;

	solitaireGame.prototype.downOnSolitaireCard = this.downOnCard = this.moveOnCard = null;

	// Remove all event handlers
	if( document.removeEventListener ) {
		document.removeEventListener('mouseup',this.handleMouseupOnCards,false);
		document.removeEventListener('mousemove',this.handleMousemoveOnCards,false);
	} else if( document.detachEvent ) {
		document.detachEvent('onmouseup',this.handleMouseupOnCards);
		document.detachEvent('onmousemove',this.handleMousemoveOnCards);
	} else {
		document.onmouseup = this.oldmouseup;
		document.onmousemove = this.oldmousemove;
		this.oldmouseup = null;
		this.oldmousemove = null;
	}

	while( !noRepositioning && oCard ) {
		oCard.autoPositionSolitaire();
		oCard = oCard.nextOnStack();
	}

};

solitaireGame.prototype.handleMousemoveOnCards = function (e) {

	// Drag a card if needed
	var thisCard = solitaireGame.prototype.downOnSolitaireCard;
	if( !thisCard ) { return; } // Hope this never happens :)
	if( !thisCard.game.gameInPlay ) { return; }
	if( thisCard.game.doingSpatNav ) { return; }
	if( !thisCard.game.downOnCard && !thisCard.game.moveOnCard ) { return; }

	if( thisCard.game.downOnCard ) {
		// Start dragging
		thisCard.game.moveOnCard = thisCard.game.downOnCard;
		thisCard.game.downOnCard = null;
		var tmpCard = thisCard;
		while( tmpCard ) {
			tmpCard.representation.style.zIndex = 30 + tmpCard.positionOnStack;
			tmpCard.representation.style.opacity = '0.4';
			tmpCard.representation.style.MozOpacity = '0.4';
			tmpCard.representation.style.filter = 'alpha(opacity=40)';
			if( tmpCard.representation.style.setProperty ) {
				// Safari 1.1
				try { tmpCard.representation.style.setProperty('-khtml-opacity','0.4'); } catch(e) {}
			}
			tmpCard = tmpCard.nextOnStack();
		}
	}

	// Move all dragged cards
	var oNum = typeof(0);
	var oNewInfo = [
		( typeof( e.pageX ) == oNum ) ? e.pageX : ( e.clientX + thisCard.game.checkBrowserScrollBug( document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft ) ),
		( typeof( e.pageY ) == oNum ) ? e.pageY : ( e.clientY + thisCard.game.checkBrowserScrollBug( document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop ) )
	];
	oNewInfo[0] = thisCard.eventInformation[2] + ( oNewInfo[0] - thisCard.eventInformation[0] );
	oNewInfo[1] = thisCard.eventInformation[3] + ( oNewInfo[1] - thisCard.eventInformation[1] );

	var oOffset = 0;
	while( thisCard ) {
		thisCard.representation.style.left = oNewInfo[0] + 'px';
		thisCard.representation.style.top = ( oNewInfo[1] + Math.round( oOffset ) ) + 'px';
		oOffset += thisCard.game.usingCards.height / 10;
		thisCard = thisCard.nextOnStack();
	}

};

solitaireGame.prototype.checkSolitaireIntersect = function(oWidth,oHeight,x1,y1,x2,y2) {
	// Enable this for debugging
//	alert(oWidth+' '+oHeight+' '+x1+' '+y1+' '+x2+' '+y2)
	return ( x2 < x1 + oWidth ) && ( x1 < x2 + oWidth ) && ( y2 < y1 + oHeight ) && ( y1 < y2 + oHeight );
}

solitaireGame.prototype.handleMouseupOnCards = function (e) {

	var thisCard = solitaireGame.prototype.downOnSolitaireCard;
	if( !thisCard ) { return; } // Hope this never happens :)
	if( !thisCard.game.gameInPlay ) { return; }
	if( thisCard.game.doingSpatNav ) { return; }

	// Only the main mouse button can be used for dragging
	if( !e ) { e = window.event; }
	if( !e.which ) { e.which = e.button; }
	if( e.which > 1 ) { return; }

	solitaireGame.prototype.downOnSolitaireCard = null;
	if( !thisCard.game.moveOnCard ) { return; }
	var intersectingStack = false, allStacks = thisCard.game.cardStacks;
	thisCard.wasDragged = true;

	// Move all dragged cards
	var oNum = typeof(0);
	var oNewInfo = [
		( typeof( e.pageX ) == oNum ) ? e.pageX : ( e.clientX + thisCard.game.checkBrowserScrollBug( document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft ) ),
		( typeof( e.pageY ) == oNum ) ? e.pageY : ( e.clientY + thisCard.game.checkBrowserScrollBug( document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop ) )
	];
	oNewInfo[0] = thisCard.eventInformation[2] + ( oNewInfo[0] - thisCard.eventInformation[0] );
	oNewInfo[1] = thisCard.eventInformation[3] + ( oNewInfo[1] - thisCard.eventInformation[1] );

	var currentStack = thisCard.cardStack;
	// Check if the card intersects a destination stack

	for( var i = 2; i < 13; i++ ) {
		if( thisCard.game.checkSolitaireIntersect( thisCard.game.usingCards.width,thisCard.game.usingCards.height,oNewInfo[0],oNewInfo[1],thisCard.game.cardStacks[i].leftPos, thisCard.game.cardStacks[i].topPos + ( ( thisCard.game.cardStacks[i].type == 3 ) ? ( ( thisCard.game.cardStacks[i].cardsInStack.length - 1 ) * ( thisCard.game.usingCards.height / 10 ) ) : 0 ) ) ) {
			if( thisCard.moveToStackIfPossible(thisCard.game.cardStacks[i],e.altKey) ) {
				thisCard.game.clearMouseEvents(true);
				return;
			}
		}
	}

	thisCard.game.clearMouseEvents();

};

/*****************
 Prefs management
*****************/

solitaireGame.prototype.getPrefCookies = function () {
	// Get all prefs (cookies) and put them in an array for easy access
	solitaireGame.prototype.solitairepref = [];
	var solicooks = document.cookie.split('; ');
	for( var n = 0, crumb; n < solicooks.length; n++ ) {
		crumb = solicooks[n].split('=');
		this.solitairepref[unescape(crumb[0])] = unescape(crumb[1]);
	}
}
solitaireGame.prototype.getPrefCookies();

solitaireGame.prototype.makeNewPrefCookie = function (oName,oValue) {
	// Store a cookie for 1 year with the chosen pref (not essential - prefs will always work until the page is unloaded)
	document.cookie = escape(oName)+'='+escape(oValue)+';expires='+
		( new Date( ( new Date() ).getTime() + ( 189216000000000 ) ) ).toGMTString()+';path=/;domain='+location.hostname;
}

// Argh, I HATE using DOM for this sort of thing - it is so slow and laborious

solitaireGame.prototype.showPrefs = function (e) {

	if( this.downOnCard || this.moveOnCard ) {
		this.clearMouseEvents();
	}

	var inPlay = this.gameInPlay;
	this.gameInPlay = false;

	// Show prefs
	var prefsEl = this.showingPrefs = document.createElement('div');
	this.showingPrefs.className = 'solitaireprefs';
	this.showingPrefs.style.position = 'absolute';
	this.showingPrefs.style.left = '0px';
	this.showingPrefs.style.top = '0px';
	// Firefox's scrollbar anagement may cause an overlap while the prefs are showing - can't be helped
	this.showingPrefs.style.width = '100%';
	if( window.attachEvent && window.ActiveXObject && navigator.platform == 'Win32' ) {
		// IE does not understand percentages correctly
		this.showingPrefs.style.height = this.workspace.offsetHeight + 'px';
	} else {
		this.showingPrefs.style.height = '100%';
	}
	this.showingPrefs.style.zIndex = 100;
	var oForm = document.createElement('form');
	oForm.relatedGame = this;
	oForm.method = 'get';
	oForm.action = '';
	oForm.onsubmit = function () { return false; }
	var firstSelect = document.createElement('select');
	var secndSelect = document.createElement('select');
	// I would use radio buttons, but IE refuses to let them work
	var thirdSelect = document.createElement('select');
	var submitBut = document.createElement('input');
	var cancelBut = document.createElement('input');
	var imageDiv = document.createElement('div');
	// Stupid browsers - reserved words means they all choose their own name for it
	// Konq/Safari will throw an error
	//imageDiv.style.float = 'right';
	imageDiv.style.styleFloat = 'right';
	imageDiv.style.cssFloat = 'right';
	submitBut.setAttribute('type','button');
	submitBut.value = this.strings.prefDone;
	cancelBut.setAttribute('type','button');
	cancelBut.value = this.strings.prefCanc;
	cancelBut.onclick = function () {
		if( oForm.relatedGame.oncancelprefs && !oForm.relatedGame.oncancelprefs({type:'cancelprefs',target:oForm.relatedGame,currentTarget:oForm.relatedGame}) ) { return; }
		oForm.relatedGame.gameInPlay = inPlay;
		prefsEl.parentNode.removeChild(prefsEl);
		oForm.relatedGame.showingPrefs = null;
	};
	submitBut.onclick = function () {
		var pref1name = oForm.relatedGame.name+'x'+secndSelect.cardSet.width;
		var pref2name = oForm.relatedGame.name+'deal';
		if( oForm.relatedGame.onsaveprefs && !oForm.relatedGame.onsaveprefs({type:'saveprefs',target:oForm.relatedGame,currentTarget:oForm.relatedGame,cardSet:secndSelect.cardSet,cardBack:secndSelect.backs[secndSelect.selectedIndex][0],dealNum:thirdSelect.selectedIndex?3:1}) ) { return; }
		oForm.relatedGame.solitairepref[pref1name] = secndSelect.cardSet.width+'x'+secndSelect.cardSet.height+'|'+secndSelect.cardSet.imageset+'|'+secndSelect.backs[secndSelect.selectedIndex][0];
		oForm.relatedGame.solitairepref[pref2name] = thirdSelect.selectedIndex ? '3' : '1';
		oForm.relatedGame.makeNewPrefCookie(pref1name,oForm.relatedGame.solitairepref[pref1name]);
		oForm.relatedGame.makeNewPrefCookie(pref2name,oForm.relatedGame.solitairepref[pref2name]);
		oForm.relatedGame.dealNum = parseInt(oForm.relatedGame.solitairepref[oForm.relatedGame.name+'deal']);
		oForm.relatedGame.usingCards = null;
		oForm.relatedGame.setAppropriateSize();
		oForm.relatedGame.gameInPlay = inPlay;
		prefsEl.parentNode.removeChild(prefsEl);
		oForm.relatedGame.showingPrefs = null;
	};
	var prfHead = document.createElement('h3');
	prfHead.appendChild(document.createTextNode(this.strings.prefName));
	var imgHead = document.createElement('h4');
	imgHead.appendChild(document.createTextNode(this.strings.imgPref+this.usingCards.width));
	var dealHead = document.createElement('h4');
	dealHead.appendChild(document.createTextNode(this.strings.dealPref));
	var firstP = document.createElement('p');
	var secndP = document.createElement('p');
	var thirdP = document.createElement('p');
	var forthP = document.createElement('p');
	if( window.attachEvent && window.ActiveXObject && navigator.platform == 'Win32' ) {
		// IE guillotine bug - Argh
		prfHead.style.zoom = '1';
		imgHead.style.zoom = '1';
		dealHead.style.zoom = '1';
		firstP.style.zoom = '1';
		secndP.style.zoom = '1';
		thirdP.style.zoom = '1';
		forthP.style.zoom = '1';
	}
	// IE cannot work the labels properly - there is no workaround
	var firstLabel = document.createElement('label');
	var secndLabel = document.createElement('label');
	firstP.appendChild(firstLabel);
	secndP.appendChild(secndLabel);
	thirdP.appendChild(thirdSelect);
	forthP.appendChild(submitBut);
	forthP.appendChild(cancelBut);
	firstLabel.appendChild(document.createTextNode(this.strings.cardPref));
	firstLabel.appendChild(document.createElement('br'));
	firstLabel.appendChild(firstSelect);
	secndLabel.appendChild(document.createTextNode(this.strings.backPref));
	secndLabel.appendChild(document.createElement('br'));
	secndLabel.appendChild(secndSelect);
	thirdSelect.options[0] = new Option(this.strings.deal1,'');
	thirdSelect.options[1] = new Option(this.strings.deal3,'');
	thirdSelect.options[(this.dealNum==1)?0:1].selected = true;
	thirdSelect.selectedIndex = [(this.dealNum==1)?0:1];

	oForm.appendChild(imageDiv);
	oForm.appendChild(prfHead);
	oForm.appendChild(imgHead);
	oForm.appendChild(firstP);
	oForm.appendChild(secndP);
	oForm.appendChild(dealHead);
	oForm.appendChild(thirdP);
	oForm.appendChild(forthP);
	prefsEl.appendChild(oForm);

	var oCardSet = this.usingCards, oCardBack = this.cardBack;
	var oCardsAll = this.cards.imagePacks.widths[this.usingCards.width];
	prefsEl.firstSelI = 0;
	for( var i = 0, newOption; i < oCardsAll.length; i++ ) {
		newOption = new Option(oCardsAll[i].name,'');
		if( oCardSet == oCardsAll[i] ) {
			// Doesn't always work, so I set selectedIndex below
			newOption.selected = true;
			prefsEl.firstSelI = i;
		}
		firstSelect.options[firstSelect.options.length] = newOption;
	}

	firstSelect.onchange = function () {
		secndSelect.options.length = 0;
		secndSelect.cardSet = oCardsAll[this.selectedIndex];
		secndSelect.backs = secndSelect.cardSet.backimages;
		prefsEl.secndSelI = 0;
		for( var i = 0, newOption; i < secndSelect.backs.length; i++ ) {
			newOption = new Option(secndSelect.backs[i][1],'');
			if( ( oCardSet == secndSelect.cardSet ) && ( secndSelect.backs[i][0] == oCardBack ) ) {
				newOption.selected = true;
				prefsEl.secndSelI = i;
			}
			secndSelect.options[secndSelect.options.length] = newOption;
		}
		secndSelect.selectedIndex = prefsEl.secndSelI;
		secndSelect.onchange();
	};
	secndSelect.onchange = function () {
		if( navigator.product == 'Gecko' ) {
			// Weird Firefox bug makes the contents of the div creep down from the top every time the images are added
			// Re-inserting the div fixes it
			oForm.insertBefore(imageDiv,prfHead);
		}
		while( imageDiv.firstChild ) {
			imageDiv.removeChild(imageDiv.firstChild);
		}
		var imgs = [], cardNum4 = [1,7,12,0], cardSuit4 = [0,2,1,0];
		var selectedSet = secndSelect.cardSet.imageset, selectedExt = secndSelect.cardSet.extension;
		for( var i = 0, innrD; i < 4; i++ ) {
			if( !( i % 2 ) ) {
				innrD = document.createElement('div');
				imageDiv.appendChild(innrD);
				// Make the non-IE browsers remove gaps between images
				// IE will fail to do display:table, but never gets image alignment correct anyway, so it doesn't matter
				try { imageDiv.style.display = 'table'; } catch(e) {}
				imageDiv.style.verticalAlign = 'bottom';
			}
			imgs[i] = document.createElement('img');
			if( cardNum4[i] ) {
				// Opera will not allow me to reference the .form property the second time I create the prefs, so I use a variable reference instead
				imgs[i].src = selectedSet + oForm.relatedGame.cards.cardSuitNames[cardSuit4[i]] + cardNum4[i] + selectedExt;
				imgs[i].setAttribute('alt',oForm.relatedGame.cards.cardNames[cardNum4[i]-1]+' '+oForm.relatedGame.cards.cardSuitNames[cardSuit4[i]]);
			} else {
				imgs[i].src = selectedSet + 'back' + this.backs[this.selectedIndex][0] + selectedExt;
				imgs[i].setAttribute('alt',oForm.relatedGame.cards.cardWord);
			}
			imgs[i].setAttribute('align','bottom');
			imgs[i].style.verticalAlign = 'bottom';
			imgs[i].style.width = secndSelect.cardSet.width + 'px';
			imgs[i].style.height = secndSelect.cardSet.height + 'px';
			innrD.appendChild(imgs[i]);
		}
	};
	firstSelect.selectedIndex = prefsEl.firstSelI;
	firstSelect.onchange();

	this.workspace.appendChild(prefsEl);
};