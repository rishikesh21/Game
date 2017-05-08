var world = [[]];

// size in the world in sprite tiles
var worldWidth = 64;
var worldHeight = 32;

// size of a tile in pixels
var tileWidth = 32;
var tileHeight = 32;

// start and end of path
var pathStart = [worldWidth,worldHeight];
var pathEnd = [0,0];
var currentPath = [];
function findPath(world, pathStart, pathEnd)
{
	// shortcuts for speed
	var	abs = Math.abs;
	var	max = Math.max;
	var	pow = Math.pow;
	var	sqrt = Math.sqrt;

	// the world data are integers:
	// anything higher than this number is considered blocked
	// this is handy is you use numbered sprites, more than one
	// of which is walkable road, grass, mud, etc
	var maxWalkableTileNum = 0;

	// keep track of the world dimensions
    // Note that this A-star implementation expects the world array to be square: 
	// it must have equal height and width. If your game world is rectangular, 
	// just fill the array with dummy values to pad the empty space.
	var worldWidth = world[0].length;
	var worldHeight = world.length;
	var worldSize =	worldWidth * worldHeight;

	// which heuristic should we use?
	// default: no diagonals (Manhattan)
	var distanceFunction = ManhattanDistance;
	var findNeighbours = function(){}; // empty

	/*

	// alternate heuristics, depending on your game:

	// diagonals allowed but no sqeezing through cracks:
	var distanceFunction = DiagonalDistance;
	var findNeighbours = DiagonalNeighbours;

	// diagonals and squeezing through cracks allowed:
	var distanceFunction = DiagonalDistance;
	var findNeighbours = DiagonalNeighboursFree;

	// euclidean but no squeezing through cracks:
	var distanceFunction = EuclideanDistance;
	var findNeighbours = DiagonalNeighbours;

	// euclidean and squeezing through cracks allowed:
	var distanceFunction = EuclideanDistance;
	var findNeighbours = DiagonalNeighboursFree;

	*/

	// distanceFunction functions
	// these return how far away a point is to another

	function ManhattanDistance(Point, Goal)
	{	// linear movement - no diagonals - just cardinal directions (NSEW)
		return abs(Point.x - Goal.x) + abs(Point.y - Goal.y);
	}

	function DiagonalDistance(Point, Goal)
	{	// diagonal movement - assumes diag dist is 1, same as cardinals
		return max(abs(Point.x - Goal.x), abs(Point.y - Goal.y));
	}

	function EuclideanDistance(Point, Goal)
	{	// diagonals are considered a little farther than cardinal directions
		// diagonal movement using Euclide (AC = sqrt(AB^2 + BC^2))
		// where AB = x2 - x1 and BC = y2 - y1 and AC will be [x3, y3]
		return sqrt(pow(Point.x - Goal.x, 2) + pow(Point.y - Goal.y, 2));
	}

	// Neighbours functions, used by findNeighbours function
	// to locate adjacent available cells that aren't blocked

	// Returns every available North, South, East or West
	// cell that is empty. No diagonals,
	// unless distanceFunction function is not Manhattan
	function Neighbours(x, y)
	{
		var	N = y - 1,
		S = y + 1,
		E = x + 1,
		W = x - 1,
		myN = N > -1 && canWalkHere(x, N),
		myS = S < worldHeight && canWalkHere(x, S),
		myE = E < worldWidth && canWalkHere(E, y),
		myW = W > -1 && canWalkHere(W, y),
		result = [];
		if(myN)
		result.push({x:x, y:N});
		if(myE)
		result.push({x:E, y:y});
		if(myS)
		result.push({x:x, y:S});
		if(myW)
		result.push({x:W, y:y});
		findNeighbours(myN, myS, myE, myW, N, S, E, W, result);
		return result;
	}

	// returns every available North East, South East,
	// South West or North West cell - no squeezing through
	// "cracks" between two diagonals
	function DiagonalNeighbours(myN, myS, myE, myW, N, S, E, W, result)
	{
		if(myN)
		{
			if(myE && canWalkHere(E, N))
			result.push({x:E, y:N});
			if(myW && canWalkHere(W, N))
			result.push({x:W, y:N});
		}
		if(myS)
		{
			if(myE && canWalkHere(E, S))
			result.push({x:E, y:S});
			if(myW && canWalkHere(W, S))
			result.push({x:W, y:S});
		}
	}

	// returns every available North East, South East,
	// South West or North West cell including the times that
	// you would be squeezing through a "crack"
	function DiagonalNeighboursFree(myN, myS, myE, myW, N, S, E, W, result)
	{
		myN = N > -1;
		myS = S < worldHeight;
		myE = E < worldWidth;
		myW = W > -1;
		if(myE)
		{
			if(myN && canWalkHere(E, N))
			result.push({x:E, y:N});
			if(myS && canWalkHere(E, S))
			result.push({x:E, y:S});
		}
		if(myW)
		{
			if(myN && canWalkHere(W, N))
			result.push({x:W, y:N});
			if(myS && canWalkHere(W, S))
			result.push({x:W, y:S});
		}
	}

	// returns boolean value (world cell is available and open)
	function canWalkHere(x, y)
	{
		return ((world[x] != null) &&
			(world[x][y] != null) &&
			(world[x][y] <= maxWalkableTileNum));
	};

	// Node function, returns a new object with Node properties
	// Used in the calculatePath function to store route costs, etc.
	function Node(Parent, Point)
	{
		var newNode = {
			// pointer to another Node object
			Parent:Parent,
			// array index of this Node in the world linear array
			value:Point.x + (Point.y * worldWidth),
			// the location coordinates of this Node
			x:Point.x,
			y:Point.y,
			// the heuristic estimated cost
			// of an entire path using this node
			f:0,
			// the distanceFunction cost to get
			// from the starting point to this node
			g:0
		};

		return newNode;
	}

	// Path function, executes AStar algorithm operations
	function calculatePath()
	{
		// create Nodes from the Start and End x,y coordinates
		var	mypathStart = Node(null, {x:pathStart[0], y:pathStart[1]});
		var mypathEnd = Node(null, {x:pathEnd[0], y:pathEnd[1]});
		// create an array that will contain all world cells
		var AStar = new Array(worldSize);
		// list of currently open Nodes
		var Open = [mypathStart];
		// list of closed Nodes
		var Closed = [];
		// list of the final output array
		var result = [];
		// reference to a Node (that is nearby)
		var myNeighbours;
		// reference to a Node (that we are considering now)
		var myNode;
		// reference to a Node (that starts a path in question)
		var myPath;
		// temp integer variables used in the calculations
		var length, max, min, i, j;
		// iterate through the open list until none are left
		while(length = Open.length)
		{
			max = worldSize;
			min = -1;
			for(i = 0; i < length; i++)
			{
				if(Open[i].f < max)
				{
					max = Open[i].f;
					min = i;
				}
			}
			// grab the next node and remove it from Open array
			myNode = Open.splice(min, 1)[0];
			// is it the destination node?
			if(myNode.value === mypathEnd.value)
			{
				myPath = Closed[Closed.push(myNode) - 1];
				do
				{
					result.push([myPath.x, myPath.y]);
				}
				while (myPath = myPath.Parent);
				// clear the working arrays
				AStar = Closed = Open = [];
				// we want to return start to finish
				result.reverse();
			}
			else // not the destination
			{
				// find which nearby nodes are walkable
				myNeighbours = Neighbours(myNode.x, myNode.y);
				// test each one that hasn't been tried already
				for(i = 0, j = myNeighbours.length; i < j; i++)
				{
					myPath = Node(myNode, myNeighbours[i]);
					if (!AStar[myPath.value])
					{
						// estimated cost of this particular route so far
						myPath.g = myNode.g + distanceFunction(myNeighbours[i], myNode);
						// estimated cost of entire guessed route to the destination
						myPath.f = myPath.g + distanceFunction(myNeighbours[i], mypathEnd);
						// remember this new path for testing above
						Open.push(myPath);
						// mark this node in the world graph as visited
						AStar[myPath.value] = true;
					}
				}
				// remember this route as having no more untested options
				Closed.push(myNode);
			}
		} // keep iterating until the Open list is empty
		return result;
	}

	// actually calculate the a-star path!
	// this returns an array of coordinates
	// that is empty if no path is possible
	return calculatePath();

} // end of findPath() function



function createWorld()
{
	console.log('Creating world...');

	// create emptiness
	for (var x=0; x < worldWidth; x++)
	{
		world[x] = [];

		for (var y=0; y < worldHeight; y++)
		{
			world[x][y] = 0;
		}
	}

	// scatter some walls
	for (var x=0; x < worldWidth; x++)
	{
		for (var y=0; y < worldHeight; y++)
		{
			if (Math.random() > 0.75)
			world[x][y] = 1;
		}
	}

	// calculate initial possible path
	// note: unlikely but possible to never find one...
	currentPath = [];
	while (currentPath.length == 0)
	{
		pathStart = [Math.floor(Math.random()*worldWidth),Math.floor(Math.random()*worldHeight)];
		pathEnd = [Math.floor(Math.random()*worldWidth),Math.floor(Math.random()*worldHeight)];
		if (world[pathStart[0]][pathStart[1]] == 0)
		currentPath = findPath(world,pathStart,pathEnd);
	}
	//redraw();

}




var __extends = (this && this.__extends) || (function() {
  var extendStatics = Object.setPrototypeOf ||
    ({
        __proto__: []
      }
      instanceof Array && function(d, b) {
        d.__proto__ = b;
      }) ||
    function(d, b) {
      for (var p in b)
        if (b.hasOwnProperty(p)) d[p] = b[p];
    };
  return function(d, b) {
    extendStatics(d, b);

    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
})();
var Game;
(function(Game) {
  var GameImage = (function() {
    function GameImage(name, src) {
      this.name = name;
      this.src = src;
      this.node = document.createElement("img");
      GameImage._pending++;
      this.node.onload = GameImage._loading;
      this.node.src = this.src;
      GameImage.all.push(this);
    }
    GameImage.loaded = function() {
      return this._loaded === this._pending;
    };
    GameImage._loading = function() {
      this._loaded++;
    };
    GameImage.getImage = function(id) {
      return this.all.find(function(img) {
        return img.name === id;
      });
    };
    return GameImage;
  }());
  GameImage.all = [];
  GameImage._loaded = 0;
  GameImage._pending = 0;
  new GameImage("background", "http://res.cloudinary.com/dfhppjli0/image/upload/c_scale,w_2048/v1492045665/road_dwsmux.png");
  new GameImage("hero", "images/taxi.png");
  new GameImage("monster", "http://res.cloudinary.com/dfhppjli0/image/upload/v1491958478/monster_rsm0po.png");
  new GameImage("hero_other", "images/taxi9.png");

  function distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  function degreeToRadian(degrees) {
    return degrees * (Math.PI / 180);
  }

  function radianToDegree(radians) {
    return radians * (180 / Math.PI);
  }

  function angleBetweenTwoPoints(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  }
  var Actor = (function() {
    function Actor() {
      this.angle = 0;
    }
    Actor.prototype.main = function() {};
    Actor.prototype.render = function(ctx) {
      if (this.angle != 0) {
        var rads = degreeToRadian(this.angle - 90);
        ctx.translate(this.position.x + 0.5 * this.image.node.naturalWidth, this.position.y + 0.5 * this.image.node.naturalHeight);
        ctx.rotate(rads);
        ctx.drawImage(this.image.node, 0, 0);
        ctx.rotate(-rads);
        ctx.translate(-(this.position.x + 0.5 * this.image.node.naturalWidth), -(this.position.y + 0.5 * this.image.node.naturalHeight));
      } else {
        ctx.drawImage(this.image.node, this.position.x, this.position.y);
      }
    };
    return Actor;
  }());
  var Monster = (function(_super) {
    __extends(Monster, _super);

    function Monster(position) {
      var _this = _super.call(this) || this;
      _this.position = position;
      _this.image = GameImage.getImage("monster");
      Monster.all.push(_this);
      return _this;
    }
    return Monster;
  }(Actor));
  Monster.all = [];
  var Car = (function(_super) {
    __extends(Car, _super);

    function Car(position, target) {
      if (target === void 0) {
        target = null;
      }
      var _this = _super.call(this) || this;
      _this.position = position;
      _this.target = target;
      _this.hitCount = 0;
      _this.image = GameImage.getImage("hero");
      _this.speed = 9;
      Car.all.push(_this);
      return _this;
    }
    var hitCount=0;
    Car.prototype.main = function() {
      var angle = angleBetweenTwoPoints(this.target.position, this.position);
      var cos = Math.cos(degreeToRadian(angle)) * -1;
      var sin = Math.sin(degreeToRadian(angle));
      var _this = _super.call(this) || this;
      this.angle = angle;
      this.position.x += cos * this.speed;
      this.position.y -= sin * this.speed;
      if (distance(this.position, this.target.position) < 10 && this.image == GameImage.getImage("hero") ) {
        this.target.position.x = Math.random() * mainCanvas.width;
        this.target.position.y = Math.random() * mainCanvas.height;
        this.hitCount++;
        console.log(hitCount);
        ctx.fillText("points : " + hitCount, 32, 32);
         this.changeImage = true;
          _this.speed = 3;
        this.changeImageTime = Date.now() + 600; //0.5 sec from now.

        this.image = (this.image == GameImage.getImage("hero"))? GameImage.getImage("hero_other") : GameImage.getImage("hero");

      }

      if(this.changeImage){
      if(Date.now() > this.changeImageTime){
        this.changeImage = false;
        _this.speed = 9;
        this.image = (this.image == GameImage.getImage("hero_other"))? GameImage.getImage("hero") : GameImage.getImage("hero_other");
      }
    }


    };
    return Car;
  }(Actor));
  Car.all = [];
  var background = GameImage.getImage("background");
  var mainCanvas = document.body.appendChild(document.createElement("canvas"));
  mainCanvas.width =  worldWidth * tileWidth;;
  mainCanvas.height = worldHeight * tileHeight;
  var ctx = mainCanvas.getContext("2d");
  var monster1 = new Monster({
    x: Math.random() * mainCanvas.width,
    y: Math.random() * mainCanvas.height
  });
  var monster2 = new Monster({
    x: Math.random() * mainCanvas.width,
    y: Math.random() * mainCanvas.height
  });
  var monster3 = new Monster({
    x: Math.random() * mainCanvas.width,
    y: Math.random() * mainCanvas.height
  });
  new Car({
    x: Math.random() * mainCanvas.width,
    y: Math.random() * mainCanvas.height
  }, monster1);
  new Car({
    x: Math.random() * mainCanvas.width,
    y: Math.random() * mainCanvas.height
  }, monster2);
  new Car({
    x: Math.random() * mainCanvas.width,
    y: Math.random() * mainCanvas.height
  }, monster3);
 




  function main() {
    ctx.drawImage(background.node, 0, 0);
    for (var ci = 0; ci < Car.all.length; ci++) {
      var c = Car.all[ci];
      c.main();
      c.render(ctx);
    }
    for (var mi = 0; mi < Monster.all.length; mi++) {
      var m = Monster.all[mi];
      m.main();
      m.render(ctx);
    }
    requestAnimationFrame(main);
    
  }

createWorld();
/*
  mainCanvas.addEventListener('click', function(event) {
     var monster9 = new Monster({
    x: Math.random() * mainCanvas.width,
    y: Math.random() * mainCanvas.height
  });

}, false);*/
	mainCanvas.addEventListener("click", canvasClick, false);

  requestAnimationFrame(main);
  function canvasClick(e)
{
	var x;
	var y;

	// grab html page coords
	if (e.pageX != undefined && e.pageY != undefined)
	{
		x = e.pageX;
		y = e.pageY;
	}
	else
	{
		x = e.clientX + document.body.scrollLeft +
		document.documentElement.scrollLeft;
		y = e.clientY + document.body.scrollTop +
		document.documentElement.scrollTop;
	}

	// make them relative to the canvas only
	/*var mainCanvas = document.body.appendChild(document.createElement("canvas"));
  */
	x -= mainCanvas.offsetLeft;
	y -= mainCanvas.offsetTop;

	// return tile x,y that we clicked
	var cell =
	[
	Math.floor(x/tileWidth),
	Math.floor(y/tileHeight)
	];

	// now we know while tile we clicked
	console.log('we clicked tile '+cell[0]+','+cell[1]);

	pathStart = pathEnd;
	pathEnd = cell;

	// calculate path
	currentPath = findPath(world,pathStart,pathEnd);
	console.log(currentPath);
	//redraw();
	
}


})(Game || (Game = {}));


