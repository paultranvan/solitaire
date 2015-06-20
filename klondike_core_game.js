/****************************************************************************************
                  Script to provide an API for managing card games
                  Written by Mark Wilton-Jones, 20/12/2005-8/1/2006
*****************************************************************************************

Please see http://www.howtocreate.co.uk/jslibs/ for details and a demo of this script
Please see http://www.howtocreate.co.uk/tutorials/jsexamples/solitaire.html for a demonstration
Please see http://www.howtocreate.co.uk/jslibs/termsOfUse.html for terms of use
_____________________________________________________________________________________________________

Card game core API documentation:

public class cardSet()
	Class representing a deck of cards.
cardSet.defaultCardNames
	Array of strings used as alternative text for card faces. Defaults to the standard 'Ace' to 'King'. Use
	cardSet.setCardNames to change this.
cardSet.defaultCardWord
	String used as alternative text on the back of the card. Defaults to 'Card'. Use cardSet.setCardNames to
	change this.
cardSet.imagePacks
	Reference to an imagePacks object, which contains a list of all available image packs that have been added
	using addImagePack (see the imagePacks definition for more information).
cardSet.playingCards
	Array of all cards in the deck.
cardSet.addCard(string: suit,integer: cardnumber,mixed: color)
	Adds the specified card into the deck.
	Suit should normally be one of 'spades', 'hearts', 'clubs', 'diamonds'.
	Cardnumber should be in the range 1-13 (unless you wish to create a joker - you may want to create this as
	card 14 in a new suit - remember to use changeCardNames as appropriate [add an extra card name on the end]).
	Color is an arbitrary value and is for your own use only.
cardSet.addImageCache(string: src)
	Adds an image into the cache, to ensure image changes run smoothly. If an image fails to load, an alert will
	be displayed, unless you set the global variable 'hideCardGameErrors' to true.
	addImageCache is called automatically when setting image packs.
cardSet.create52Cards(optional string array: suits)
	Creates a standard set of 52 cards, and adds them to the existing deck. No redrawing is performed. If you
	provide suits, it will use the first 4 strings to select the 4 suits. These will also be used by the images.
cardSet.forcePageRedraw()
	Attempts to force an entire page redraw in a variety of browsers. Use to avoid bad rendering bugs but do
	not overuse - it is expensive in terms of performance.
cardSet.redrawCards()
	Forces cards to redraw - can be used to avoid rendering bugs, or just to refresh after making a change.
cardSet.setCardNames(optional string: cardword,optional array: cardnames)
	Changes card names (used as alt text).
	The cardword should be the word used in place of the card back - default is 'Card'.
	Cardnames should be an array of strings with the names of all cards, normally from 'Ace' to 'King' (default).
cardSet.setCardSize(string: width,string: height)
	Sets the width and height styles of all card images. Cards will redraw if needed.
cardSet.setImagePack(string: imageset,string: backimage,string: extension)
	Tells the cards to use the images specified (must be called in any game before dealing).
	Can be called at any time during the game for an instant facelift. Cards will redraw if needed.
	Card faces will be created as; imageset + suit + number + extension
	Card backs will be created as; imageset + 'back' + backimage + extension
	Suit is one of 'spades', 'hearts', 'clubs', 'diamonds'.
	Number is 1-14.
cardSet.shuffleCards(optional integer: times)
	Sorts the cards in a random order within the cardSet.playingCards array. No redrawing is performed. If
	you pass an integer to it, it will sort that many times (in case the browser has a bad random number
	generator). Default is 3 times.

public class cardStack(mixed: type,mixed: index,bool: createDiv,optional string: stackText)
	A class representing a visual stacking of cards within the game area, for example, the deck of undealt
	cards in a game of solitaire. type and index are arbitrary, and can be used simply to keep a reference
	of the features of a specific stack. If createDiv is true, the hotspot property will be created as a
	div with position:absolute, and a className of 'hotspot'. If a hotspot is created, then any text you
	provide in stackText will be added to the hotspot.
cardStack.cardsInStack
	Array of all cards in the stack.
cardStack.hotspot
	A reference to a div element with position set to absolute.
cardStack.type
	The specified stack type.
cardStack.index
	The specified stack index.
cardStack.moveToStack(playingCard)
	Moves a given card into the current stack, and removes it from any existing stack. Note that
	cardStack.cardsInStack does not automatically collapse down when cards are removed from it. This is
	behaviourly synonymous to playingCard.moveToStack
cardStack.setStyles(left,top,zIndex,width,height,fontSize)
	Sets the appropriate styles on the card stack's hotspot.
cardStack.truncate(optional integer: length)
	Shortens the number of cards in the stack to the given length. If no length is given, the card stack
	will be shortened to remove all trailing empty cells.

public class imagePacks()
	Class representing an available set of images, including their sizes, so that appropriate size of
	image set can be chosen for the available space. Do not create instances of this class directly,
	they are created atomatically for each cardSet and can be accessed through cardSet.imagePacks.
imagePacks.availCombo
	Object with property names matching each combination of image set and back image. The property names are
	created as width+'x'+height+'|'+imageset+'|'+backimage (for use with storing and retrieving preferences).
	Each property references an image pack that match that image combination. Image packs are stored in
	object form with the properties 'imageset', 'backimages', 'extension', 'width', 'height', and 'name'
	(these will match the values passed to the addImagePack method).
imagePacks.availHeights
	Array of available card heights, added using imagePacks.addCardPack. Array will be sorted in descending
	order.
imagePacks.availWidths
	Array of available card widths, added using imagePacks.addCardPack. Array will be sorted in descending
	order.
imagePacks.heights
	Object with property names matching the sizes of the available cards. Each property references an array
	of image packs that match that size (in the same way as with imagePacks.availCombo). For example,
	imagePacks.heights[100][0] will reference the first image pack added with a height of 100.
imagePacks.widths
	Same as imagePacks.heights, but for widths instead of heights.
imagePacks.addImagePack(string: imageset,array: backimages,string: extension,integer: cardWidth,integer: cardHeight,string: name)
	Adds an image pack into the list of available image packs. The values of imageset and extension should be
	compatible with those used by cardSet.setImagePack. cardWidth and cardHeight are for use with
	getFittingImageSize. backimages should be an array of entries. Each entry should be an array with two
	cells: string backimage, string name. This should list all available card back images in this image set.
	Each should be compatible with the backimage value expected by cardSet.setImagePack. The name is a name
	that you want to refer to the image pack as (this is used only for your own reference, so multiple image
	packs may share the same name).
imagePacks.getFittingImageSize(bool: heightOrWidth,integer: size)
	Attempts to find the largest possible card size within the given size limit. The appropriate size of the
	card is returned. If none can be found, it returns the smallest available card size. If no card packs are
	available, it returns null. heightOrWidth should be true if you want to check heights, and false if you
	want to check widths.

public class playingCard(string: suit,integer: cardnumber,mixed: color,object: cardSet)
	Class representing a card in the deck. It is generally best to use cardSet.create52Cards,
	cardSet.addCard, or playingCard.changeCard instead of creating instances manually - if you do,
	you will need to add them to the cardSet.playingCards array.
playingCard.suit playingCard.number playingcard.color
	The values provided when creating the card.
playingCard.cardImage
	A reference to the card image. It will have display:block.
playingCard.cardStack
	A reference to the cardStack object that the card is attached to (can be changed manually if needed).
playingCard.positionOnStack
	The index of the card on the cardStack
playingCard.representation
	A reference to the div containing the card image. It will have position:absolute, and a className of
	'playingcard'.
playingCard.wayup
	Boolean true if the card is face up, false if it is face down.
playingCard.changeCard(string: suit,integer: cardnumber)
	Changes the card from its current suit and number to the new number specified. Cards will be redrawn
	as needed.
playingCard.moveToStack(object: cardStack)
	Removes a card from its current stack (if it is on a stack) and puts it onto the new one. Note that
	cardStack.cardsInStack does not automatically collapse down when cards are removed from it, so you
	should use cardStack.truncate when all changes have been made. No visual changes and redraws will occur.
playingCard.nextOnStack()
	Returns a reference to the next card (with a higher stack position) on the stack. Null or undefined
	if none.
playingCard.previousOnStack()
	Returns a reference to the previous card (with a lower stack position) on the stack. Null or
	undefined if none.
playingCard.inheritCardDesign()
	Picks up the card's current design as specified by cardSet.setBackImage or cardSet.setImagePack
	Card will be redrawn if needed.
playingCard.redrawCardImage()
	Forces a card to redraw - can be used to avoid rendering bugs, or just to refresh after making a change.
	If the card has not yet inherited a card design (inheritCardDesign), this method will fail silently.
playingCard.showFace(bool: face)
	Sets the card to be either face up or face down, and redraws if needed.
	true = face up, false = face down.
playingCard.setCardSize(string: width,string: height)
	Sets the CSS width and height properties of the card image. This does _not_ change the image used. Card
	will be redrawn if needed.
_____________________________________________________________________________________________________*/

/**********************************************
 A class representing the entire deck of cards
**********************************************/

function cardSet() {
	
	// Storage for card references
	this.playingCards = [];
	this.massiveImageCache = {};
	this.imagePacks = new imagePacks();

}

cardSet.prototype.defaultCardNames = ['Ace','2','3','4','5','6','7','8','9','10','Jack','Queen','King'];
cardSet.prototype.defaultCardWord = 'Card';

cardSet.prototype.toString = function () { return '[object cardSet]'; };

cardSet.prototype.addCard = function (oSuit,oNumber,oColour) {
	// Add a card to the deck
	this.playingCards[this.playingCards.length] = new playingCard(oSuit,oNumber,oColour,this);
};

cardSet.prototype.addImageCache = function (imUrl) {
	// Add an image into the cache
	if( !this.massiveImageCache[imUrl] ) {
		var oSet = this;
		this.massiveImageCache[imUrl] = new Image();
		this.massiveImageCache[imUrl].onerror = function () {
			if( !oSet.hasAlertedImageError ) {
				oSet.hasAlertedImageError = true;
				if( !window.hideCardGameErrors ) { alert('Warning: Card game image failed\n\nA card image failed to load - the card game may not play correctly:\n'+this.src+'\n\nNo more warnings will be shown for cards in this card set.'); }
			}
		};
		this.massiveImageCache[imUrl].src = imUrl;
	}
};

cardSet.prototype.setImagePack = function (oImageSet,oBackImage,oExtension) {
	// Set card images
	this.cardSet = oImageSet;
	this.imageExtension = oExtension;
	this.backImage = oImageSet+'back'+oBackImage+oExtension;
	this.addImageCache(this.backImage);
	for( var i = 0; i < this.playingCards.length; i++ ) {
		this.playingCards[i].inheritCardDesign();
	}
};

cardSet.prototype.shuffleCards = function (oTimes) {
	// Sorting function - based on the easier Knuth shuffle
	if( !oTimes ) { oTimes = 3; }
	for( var n = 0; n < oTimes; n++ ) {
		// Three times, just in case the browser's random number generator is not very good
		for( var i = 0; i < this.playingCards.length; i++ ) {
			this.playingCards[i].tmpShuffleSortingIndex = Math.random();
		}
		this.playingCards.sort( function (a,b) {
			// OmniWeb and older Safari insists that I return a whole number, not a fraction
			return ( ( b.tmpShuffleSortingIndex - a.tmpShuffleSortingIndex ) > 0 ) ? 1 : -1;
		} );
	}
	// Enable this for debugging
//	for( var i = 0, s=''; i < this.playingCards.length - 1; i++ ) { s+= this.playingCards[i].number + ' ' + this.playingCards[i].suit + '\n'; } alert(s);
};

cardSet.prototype.setCardSize = function (oWidth,oHeight) {
	// Set a nice width for the cards - any CSS width value is allowed
	for( var i = 0; i < this.playingCards.length; i++ ) {
		this.playingCards[i].setCardSize(oWidth,oHeight);
	}
};

cardSet.prototype.redrawCards = function () {
	// Redraws all cards (resets their images and alt text to the correct values)
	for( var i = 0; i < this.playingCards.length; i++ ) {
		this.playingCards[i].redrawCardImage();
	}
};

cardSet.prototype.setCardNames = function (oCardWord,oCardNames) {
	// Change the text representation of the cards
	if( !oCardWord ) { oCardWord = this.defaultCardWord; }
	if( !oCardNames ) { oCardNames = this.defaultCardNames; }
	this.cardWord = oCardWord;
	this.cardNames = oCardNames;
	this.redrawCards();
};

cardSet.prototype.forcePageRedraw = function () {
	// Force full document redraw
	document.body.className = document.body.className ? ( document.body.className + '' ) : '';
};

cardSet.prototype.create52Cards = function (cardSuits) {
	// Create 52 cards
	this.cardSuitNames = cardSuits ? cardSuits : ['spades','hearts','clubs','diamonds']
	for( var i = 0; i < this.cardSuitNames.length; i++ ) {
		for( var n = 1; n < 14; n++ ) {
			this.addCard(this.cardSuitNames[i],n,i%2,this);
		}
	}
}

/*****************************************
 A class representing a visual card stack
 - this can be extended by the game code
*****************************************/

function cardStack(oType,oIndex,oWithDiv,oDivText) {

	this.cardsInStack = [];
	this.type = oType;
	this.index = oIndex;
	if( oWithDiv ) {
		this.hotspot = document.createElement('div');
		this.hotspot.relatedObject = this;
		this.hotspot.className = 'hotspot';
		this.hotspot.style.position = 'absolute';
		if( oDivText ) { this.hotspot.appendChild(document.createTextNode(oDivText)); }
	}
	
};

cardStack.prototype.toString = function () { return '[object cardStack: type '+this.type+', index '+this.index+']'; };

cardStack.prototype.moveToStack = function (oCard) {
	// Moving is actually done in the oposite direction
	oCard.moveToStack(this);
};

cardStack.prototype.truncate = function (oLength) {
	// Truncate the cardsInStack array
	if( typeof(oLength) == typeof(0) ) {
		this.cardsInStack.length = oLength;
	} else {
		while( this.cardsInStack.length && !this.cardsInStack[this.cardsInStack.length-1] ) {
			this.cardsInStack.length--;
		}
	}
};

cardStack.prototype.setStyles = function (oLeft,oTop,zIndex,oWidth,oHeight,oFont) {
	// Set the position of the card stack
	this.leftPos = oLeft;
	this.topPos = oTop;
	this.hotspot.style.left = oLeft + 'px';
	this.hotspot.style.top = oTop + 'px';
	this.hotspot.style.zIndex = zIndex;
	this.hotspot.style.width = oWidth;
	this.hotspot.style.height = oHeight;
	this.hotspot.style.fontSize = oFont;
	this.hotspot.style.overflow = 'hidden';
};

/*******************************************************************************
 A class representing a set of available image packs, used to display the cards
*******************************************************************************/
  
function imagePacks() {
	this.availWidths = [];
	this.availHeights = [];
	this.widths = {};
	this.heights = {};
	this.packNames = {};
	this.availCombo = {};
}

imagePacks.prototype.toString = function () { return '[object imagePacks]'; };

imagePacks.prototype.addImagePack = function (oImageSet,oBackImages,oExtension,oWidth,oHeight,oName) {
	// Add an image back with size information
	if( !this.widths[oWidth] ) {
		this.availWidths[this.availWidths.length] = oWidth;
		this.widths[oWidth] = [];
	}
	if( !this.heights[oHeight] ) {
		this.availHeights[this.availHeights.length] = oHeight;
		this.heights[oHeight] = [];
	}
	var oStore = this.widths[oWidth][this.widths[oWidth].length] = this.heights[oHeight][this.heights[oHeight].length] =
		{imageset:oImageSet,backimages:oBackImages,extension:oExtension,width:oWidth,height:oHeight,name:oName,toString:function () { return '[private object imagePack: '+this.imageset+']'; }};
	for( var i = 0; i < oBackImages.length; i++ ) {
		this.availCombo[oWidth+'x'+oHeight+'|'+oImageSet+'|'+oBackImages[i][0]] = oStore;
	}
	var sortFunc = function ( a, b ) { return b - a; };
	this.availWidths.sort(sortFunc);
	this.availHeights.sort(sortFunc);
};

imagePacks.prototype.getFittingImageSize = function (oHeightWidth,oSize) {
	// Get the nearest image set that fits. If none fit, then get the first set up.
	var checkingList = oHeightWidth ? this.availWidths : this.availHeights;
	for( var i = 0; i < checkingList.length; i++ ) {
		if( checkingList[i] <= oSize ) { return checkingList[i]; }
	}
	return checkingList.length ? checkingList[checkingList.length-1] : null;
};

/****************************
 A class representing a card
****************************/

function playingCard(oSuit,oNumber,oColour,oCardSet) {

	// Initialise settings
	this.number = oNumber;
	this.suit = oSuit;
	this.color = oColour;
	this.wayup = false;
	this.cardSet = oCardSet;
	this.cardStack = null;
	this.positionOnStack = 0;

	// Create the card image and placeholder
	this.representation = document.createElement('div');
	this.representation.relatedObject = this;
	this.representation.style.position = 'absolute';
	this.representation.className = 'playingcard';
	this.cardImage = document.createElement('img');
	this.cardImage.style.display = 'block';
	this.representation.appendChild(this.cardImage);

}

playingCard.prototype.toString = function () { return '[object playingCard: '+this.number+' '+this.suit+']'; };

playingCard.prototype.moveToStack = function (oNewStack) {
	// Move onto another card stack
	if( this.cardStack ) {
		this.cardStack.cardsInStack[ this.positionOnStack ] = null;
	}
	this.cardStack = oNewStack;
	this.positionOnStack = oNewStack.cardsInStack.length;
	oNewStack.cardsInStack[this.positionOnStack] = this;
};

playingCard.prototype.nextOnStack = function () {
	// Like nextSibling but related to card stacks
	if( !this.cardStack ) { return null; }
	return this.cardStack.cardsInStack[ this.positionOnStack + 1 ];
};

playingCard.prototype.previousOnStack = function () {
	// Like previousSibling but related to card stacks
	if( !this.cardStack ) { return null; }
	return this.cardStack.cardsInStack[ this.positionOnStack - 1 ];
};

playingCard.prototype.inheritCardDesign = function () {
	// Get the new card set images
	this.faceImage = this.cardSet.cardSet+this.suit+this.number+this.cardSet.imageExtension;
	this.cardSet.addImageCache(this.faceImage);
	this.redrawCardImage();
};

playingCard.prototype.changeCard = function (oSuit,oNumber) {
	this.number = oNumber;
	this.suit = oSuit;
	this.inheritCardDesign();
};

playingCard.prototype.redrawCardImage = function () {
	// Set or change the image showing on the card face
	if( !this.faceImage || !this.cardSet.backImage ) { return; }
	// Bug in Firefox - alt attributes do not change unless they are made _before_ an SRC change
	this.cardImage.setAttribute('alt',this.wayup?(this.cardSet.cardNames[this.number-1]+' '+this.suit):this.cardSet.cardWord);
	this.cardImage.src = this.wayup ? this.faceImage : this.cardSet.backImage;
};

playingCard.prototype.showFace = function (oWhich) {
	// Used to flip a card over
	if( this.redrawNewImage != oWhich ) {
		this.wayup = oWhich;
		this.redrawCardImage();
	}
};

playingCard.prototype.setCardSize = function (oWidth,oHeight) {
	// Set the width of the card image
	this.cardImage.style.width = oWidth;
	this.cardImage.style.height = oHeight;
	this.representation.style.width = oWidth;
	this.representation.style.height = oHeight;
};