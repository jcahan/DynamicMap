function startThis(map) {
	var myNewObject = [{"lat": 40.8157246, "keywords": "laboratory testing", "long": -73.9601383, "time": "04:49PM Sunday, June 30, 2013"}, {"lat": 40.8155555, "keywords": "self storage", "long": -73.9655555, "time": "04:49PM Sunday, June 30, 2013"},{"lat": 40.8157246, "keywords": "japanese restaurant", "long": -73.9601383, "time": "04:49PM Monday, June 30, 2013"}]; 
	var theJSON = latLongTrimmer(myNewObject); 
	drawGraph(theJSON, map);  		    
}

//Draws Graph
function drawGraph(jsonTEXT, map) {
	d3.json(jsonTEXT, function(data) {
		
		var overlay = new google.maps.OverlayView(); 

		overlay.onAdd = function() {
			var layer = d3.select(this.getPanes.overlayLayer).append("div")
				.attr("class", "coordinates"); 

			//Draw each marker as separate SVG element 
			overlay.draw = function() {
				var projection = this.getProjection(), 
					padding = 10; 
				var marker = layer.selectAll("svg")
					.data(d3.entries(data))
					.each(transform)
				  .enter().append("svg:svg")
					.each(transform)
					.attr("class","marker"); 
				
				//creates a circle 
				//TODO: Here, I need to make size of SVG a function of a variable!!

				marker.append("svg:circle")
					.attr("r", 4.5)
					.attr("cx", padding)
					.attr("cy", padding); 

				function transform(d) {
					d = new google.maps.LatLng(d.value[LAT_INDEX], d.value[LONG_INDEX]); 
					d = projection.fromLatLngToDivPixel(d); 
					return d3.select(this)
						.style("left",(d.x-padding) + "px")
						.style("top", (d.y - padding) + "px"); 
				} //closes transform
			}; //closes draw
		};  //closes onAdd
		overlay.setMap(map); 

	});  //closes JSON
}

//Reads in CSV, has Lat-Longs and combines very similar addresses 
function latLongTrimmer(allLines) {
	const NUM_OF_DECIMALS = 7; 	
	const THE_KEYWORD_MAP = new KeyWordValues; 
	
	//Grid of Buckets of Manhattan 
	var latPosMap = new Map; //HashMap of {Latitudes, ListOfKeys}
	var longPosMap = new Map; //HashMap of {Longitudes, ListOfKeys}
	var numOfLatLongPairs = 0; //used as Key

	var latLongPairMap = new Map; //HashMap of {Lat-Long-Pair, KeyWords}
	// alert("pre for loop");
	// alert("length: " + allLines.length); 

	for(var i=0; i<allLines.length; i++) {
		// alert("entered for loop"); 
		//TODO: Need to look at the format of the line. Might need to use more accurate split function like: .split("\".*\",");
		var aLine = allLines[i];
		
		var theLat = aLine["lat"].toFixed(NUM_OF_DECIMALS);
		var theLong = aLine["long"].toFixed(NUM_OF_DECIMALS);

		if(!isNaN(theLat) && !isNaN(theLong)) {
			var latList = latPosMap.get(theLat); //returns the list of latLongs corresponding to a specific lat
			var longList = longPosMap.get(theLong); //returns the list of latLongs

			var latExists = false; 
			var longExists= false; 3
			
			if(latList!=null) {
				latExists = true; 	
			}
			else {
				//create new row in latPosMap
				latPosMap.put(theLat, new Set());
			}
			if(longList!=null) {
				longExists = true; 
			}
			else {
				//create new row in longPosMap
				longPosMap.put(theLong, new Set());
			}

			var keyWordSet = new Set(); //adds all keywords to this set
			var kwArray = aLine["keywords"].split(","); 
			
			for(var x=0; x<kwArray.length; x++) {
				keyWordSet.add(kwArray[x]);
			}

			//if both lat and long exist, then check keywords 
			if(longExists&&latExists) {
				var thePosition = latList.intersection(longList);
				var thisPosition = thePosition.getElements()[0]; 
				
				//add keywords to Lat-Long
				var updateLatLong = latLongPairMap.get(thisPosition);
				var theResult = updateLatLong.union(keyWordSet);
				theResult.incrementCheckin();
				theResult.setLatAndLong(theLat, theLong); 
				// alert("the result's size is: " + theResult.size()); 

				var tmpLatLongList = theResult; 
				latLongPairMap.remove(thisPosition); 
				latLongPairMap.put(thisPosition, tmpLatLongList); 
			}
			
			//create new lat-Long, Pair
			else {
				keyWordSet.setLatAndLong(theLat, theLong); 
				latLongPairMap.put(numOfLatLongPairs, keyWordSet); 
		       
		       	//then add the lat-long ID value
				if(latExists) {
					//creates a set
					var tmp = latPosMap.get(theLat); 
					latPosMap.remove(theLat); 
					tmp.add(numOfLatLongPairs);
					// latPosMap.put(theLat,tmp); 
				}
				else {
					var latSet = new Set(); 
					latSet.add(numOfLatLongPairs); 
					latPosMap.put(theLat,latSet);
				}
				if(longExists) {
					// longList.append(numOfLatLongPairs);	
					var longTmp = longPosMap.get(theLong); 
					longPosMap.remove(theLong); 
					longPosMap.put(theLong, longTmp.add(numOfLatLongPairs)); 
				}
				else {
					var longSet = new Set(); 
					longSet.add(numOfLatLongPairs); 
					longPosMap.put(theLong,longSet);
				}				
				numOfLatLongPairs+=1; //Lat-Long Pair Identifier, used as key
			}
		
		}			
	}	
	//Now recalibrate all items within Map, and plot each dot!
	for(var i=0; i<latLongPairMap.size; i++) {
			latLongPairMap.next();
			//finds max, avg, and sum of each set
			var theSet = latLongPairMap.value(); 
			// for (int z=0; z<theSet.size(); z++) {
			// 	alert(theSet.getElements()[z]); 
			// }
			theSet.recalibrate(THE_KEYWORD_MAP); 
	}
	console.log(latLongPairMap); 
	console.log(JSON.stringify(latLongPairMap.listValues())); 
	return JSON.stringify(latLongPairMap.listValues()); 

}

//Stolen from here to get set attributes: https://github.com/jau/SetJS/blob/master/src/Set.js
function Set(elements) {
	this.bag_ = [];
	
	//TODO: Maybe extend this class 
	this.checkins = 0;
	this.sum = 0.00; 
	this.average = 0.00; 
	this.max = 0.00;  
	this.lat = 0.00; 
	this.theLong = 0.00; 

	var i;

	if (arguments.length > 0) { // optional args
		for (i=0; i < elements.length; i++) {
			this.add(elements[i]);
		}
	}
}
	
//would be part of extending 
Set.prototype.incrementCheckin = function() {
	this.checkins+=1; 
}

//go through entire "bag," and recalculate averages 
Set.prototype.recalibrate = function(KEYWORD_MAP) {
	//could do in add/union function instead...
	for(var i=0; i<this.bag_.length; i++) {
		// alert("recalibrating at index: " + i); 
		var keywordValue = KEYWORD_MAP.get(this.bag_[i]);
		this.sum += keywordValue;
		if(this.max<keywordValue) {
			this.max = keywordValue;
		}
	}
	this.average = this.sum/this.bag_.length; 
	// alert("my average is: " + this.average + "; and my sum is: " + this.sum + "; and my max is: " + this.max); 
}

Set.prototype.setLatAndLong = function(thisLat, thisLong) {
	this.lat = thisLat;
	this.theLong = thisLong;  
}

Set.prototype.search = function(e, start) {
	var j = this.bag_.length;
	var pivot;
	var i = arguments.length == 2 ? start : 0;

	while (i < j) {
		pivot = i + Math.floor((j - i) / 2);
		if (this.bag_[pivot] == e) {
			return pivot;
		}

		if (e > this.bag_[pivot]) {
			i = pivot + 1;
		} else {
			j = pivot;
		}
	}

	return i;
}

Set.prototype.add = function(e) {
	var p = this.search(e);
	if (this.bag_[p] != e) {
		this.bag_.splice(p, 0, e); // insert e at position p
	}

}

Set.prototype.contains = function(e) {
	var p = this.search(e);
	return (this.bag_[p] == e);
}

Set.prototype.size = function() {
	return this.bag_.length;
}

Set.prototype.getElements = function() {
	return this.bag_;
}

Set.prototype.equals = function(otherSet) {
	if (this.size() != otherSet.size()) {return false;}
	var i;
	for (i=0; i < this.bag_.length; i++) {
		if (this.bag_[i] != otherSet.bag_[i]) {
			return false;
		}
	}
	return true;
}

Set.prototype.difference = function(otherSet) {
	var result = new Set();

	if (this.size() == 0) {return result;}
	if (otherSet.size() == 0) {
		result.bag_ = this.bag_.slice(0); 
		return result;
	}

	var i;
	var j = 0;
	for (i=0; i < this.bag_.length; i++) {
		if (this.bag_[i] > otherSet.bag_[j]) {
			j = otherSet.search(this.bag_[i], j); // finds First otherSet[j] Not Smaller than this[i]
			if (j == otherSet.bag_.length) {break;}  // end of otherSet
		}

		if (this.bag_[i] < otherSet.bag_[j]) {
			result.bag_.push(this.bag_[i]);
		}
	}
	result.bag_ = result.bag_.concat(this.bag_.slice(i)); // adds the remaining elements, if there are any

	return result;
}

Set.prototype.intersection = function(otherSet) {
	var result = new Set();
	if ((this.size() == 0) || (otherSet.size() == 0)) {return result;}

	var i;
	var j = 0;
	for (i=0; i < this.bag_.length; i++) {
		j = otherSet.search(this.bag_[i], j); // finds First otherSet[j] Not Smaller than this[i]
		if (j == otherSet.bag_.length) {break;} // end of otherSet

		if (this.bag_[i] == otherSet.bag_[j]) {
			result.bag_.push(this.bag_[i]);
		}
	}
	return result;
}

Set.prototype.union = function(otherSet) {
	var result = new Set();
	if ((this.size() == 0) && (otherSet.size() == 0)) {return result;}
	
	var base, merged;
	if (this.size() > otherSet.size()) {
		base = this;
		merged = otherSet;
	} 
	else {
		base = otherSet;
		merged = this;
	}

	result.bag_ = base.bag_.slice(0); // make a copy
	var i;
	for (i=0; i < merged.bag_.length; i++) {
		result.add(merged.bag_[i]); // add() doesn't allow repetition
	}

	// alert("result bag's size should be true: " + result.size()); //should be of size 2!!
	return result;
}

//Hash taken from here: http://stackoverflow.com/questions/368280/javascript-hashmap-equivalent/383540?noredirect=1#comment26244173_383540
function Map(linkEntries) {
	this.current = undefined;
	this.size = 0;
	this.isLinked = true;

	if(linkEntries === false)
		this.disableLinking();
}

Map.from = function(obj, foreignKeys, linkEntries) {
	var map = new Map(linkEntries);

	for(var prop in obj) {
		if(foreignKeys || obj.hasOwnProperty(prop))
			map.put(prop, obj[prop]);
	}

	return map;
};

Map.noop = function() {
	return this;
};

Map.illegal = function() {
	throw new Error('can\'t do this with unlinked maps');
};

Map.prototype.disableLinking = function() {
	this.isLinked = false;
	this.link = Map.noop;
	this.unlink = Map.noop;
	this.disableLinking = Map.noop;
	this.next = Map.illegal;
	this.key = Map.illegal;
	this.value = Map.illegal;
	this.removeAll = Map.illegal;
	this.each = Map.illegal;
	this.flip = Map.illegal;
	this.drop = Map.illegal;
	this.listKeys = Map.illegal;
	this.listValues = Map.illegal;

	return this;
};

Map.prototype.hash = function(value) {
	return value instanceof Object ? (value.__hash ||
		(value.__hash = 'object ' + ++arguments.callee.current)) :
		(typeof value) + ' ' + String(value);
};

Map.prototype.hash.current = 0;

Map.prototype.link = function(entry) {
	if(this.size === 0) {
		entry.prev = entry;
		entry.next = entry;
		this.current = entry;
	}
	else {
		entry.prev = this.current.prev;
		entry.prev.next = entry;
		entry.next = this.current;
		this.current.prev = entry;
	}
};

Map.prototype.unlink = function(entry) {
	if(this.size === 0)
		this.current = undefined;
	else {
		entry.prev.next = entry.next;
		entry.next.prev = entry.prev;
		if(entry === this.current)
			this.current = entry.next;
	}
};

Map.prototype.get = function(key) {
	var entry = this[this.hash(key)];
	return typeof entry === 'undefined' ? undefined : entry.value;
};

Map.prototype.put = function(key, value) {
	var hash = this.hash(key);

	if(this.hasOwnProperty(hash))
		this[hash].value = value;
	else {
		var entry = { key : key, value : value };
		this[hash] = entry;

		this.link(entry);
		++this.size;
	}

	return this;
};

Map.prototype.remove = function(key) {
	var hash = this.hash(key);

	if(this.hasOwnProperty(hash)) {
		--this.size;
		this.unlink(this[hash]);

		delete this[hash];
	}

	return this;
};

Map.prototype.removeAll = function() {
	while(this.size)
		this.remove(this.key());

	return this;
};

Map.prototype.contains = function(key) {
	return this.hasOwnProperty(this.hash(key));
};

Map.prototype.isUndefined = function(key) {
	var hash = this.hash(key);
	return this.hasOwnProperty(hash) ?
		typeof this[hash] === 'undefined' : false;
};

Map.prototype.next = function() {
	this.current = this.current.next;
};

Map.prototype.key = function() {
	return this.current.key;
};

Map.prototype.value = function() {
	return this.current.value;
};

Map.prototype.each = function(func, thisArg) {
	if(typeof thisArg === 'undefined')
		thisArg = this;

	for(var i = this.size; i--; this.next()) {
		var n = func.call(thisArg, this.key(), this.value(), i > 0);
		if(typeof n === 'number')
			i += n; // allows to add/remove entries in func
	}

	return this;
};

Map.prototype.flip = function(linkEntries) {
	var map = new Map(linkEntries);

	for(var i = this.size; i--; this.next()) {
		var	value = this.value(),
			list = map.get(value);

		if(list) list.push(this.key());
		else map.put(value, [this.key()]);
	}

	return map;
};

Map.prototype.drop = function(func, thisArg) {
	if(typeof thisArg === 'undefined')
		thisArg = this;

	for(var i = this.size; i--; ) {
		if(func.call(thisArg, this.key(), this.value())) {
			this.remove(this.key());
			--i;
		}
		else this.next();
	}

	return this;
};

Map.prototype.listValues = function() {
	var list = [];

	for(var i = this.size; i--; this.next())
		list.push(this.value());

	return list;
}

Map.prototype.listKeys = function() {
	var list = [];

	for(var i = this.size; i--; this.next())
		list.push(this.key());

	return list;
}

Map.prototype.toString = function() {
	var string = '[object Map';

	function addEntry(key, value, hasNext) {
		string += '    { ' + this.hash(key) + ' : ' + value + ' }' +
			(hasNext ? ',' : '') + '\n';
	}

	if(this.isLinked && this.size) {
		string += '\n';
		this.each(addEntry);
	}

	string += ']';
	return string;
};

Map.reverseIndexTableFrom = function(array, linkEntries) {
	var map = new Map(linkEntries);

	for(var i = 0, len = array.length; i < len; ++i) {
		var	entry = array[i],
			list = map.get(entry);

		if(list) list.push(i);
		else map.put(entry, [i]);
	}

	return map;
};

Map.cross = function(map1, map2, func, thisArg) {
	var linkedMap, otherMap;

	if(map1.isLinked) {
		linkedMap = map1;
		otherMap = map2;
	}
	else if(map2.isLinked) {
		linkedMap = map2;
		otherMap = map1;
	}
	else Map.illegal();

	for(var i = linkedMap.size; i--; linkedMap.next()) {
		var key = linkedMap.key();
		if(otherMap.contains(key))
			func.call(thisArg, key, map1.get(key), map2.get(key));
	}

	return thisArg;
};

Map.uniqueArray = function(array) {
	var map = new Map;

	for(var i = 0, len = array.length; i < len; ++i)
		map.put(array[i]);

	return map.listKeys();
};

function KeyWordValues() {
	var theMap = new Map;
	theMap.put('laboratory testing', 1.53)
	.put('japanese restaurant', 1.47)
	.put('self storage', 3.21)
	return theMap; 
}