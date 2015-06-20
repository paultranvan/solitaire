
exports.CARD =  function(number, type, size, position, path) 
{
	this.number = number;
	this.type = type;
	this.size = size;
	this.position = position;
	this.color = function()
	{
		if(this.type == TYPE.SPADE || this.type == TYPE.CLUB)
			return COLOR.BLACK;
		else 
			return COLOR.RED;
	}
	this.imagePath = path;
	this.hidden = false;
}
, 
exports.POSITION =  function (x, y)
{
	this.x = x; //center
	this.y = y; //center
},

exports.TYPE = 
{
	SPADE:0, //pique
	CLUB:1, //trefle
	DIAMOND:2, //carreau
	HEART:3 //coeur
};

exports.SIZE = 
{
	height:96,
	width:72
};

exports.COLOR = 
{
	RED:0,
	BLACK:1
};





/*function SIZE(length, width)
{
	this.length = length;
	this.width = width;
}*/
/*
SIZE: function() 
{
	length:96;
	width:72;
}
,
TYPE: function() 
{
	
}
,
COLOR: function() 
{	
	RED:0;
	BLACK:1;
}
}
*/
