function startThis(map) {
	$.ajax({	
	    url: "http://127.0.0.1:80/data/chrisR/2013-06-14T00:02:52.249Z/2013-07-04T18:02:52.249Z",
       	dataType: 'json',
		    success: function(data) {
		    	alert("entering the success"); 
		    	var jsonTEXT = latLongTrimmer(data);

		    	//Draw graph within ajax 
		    	drawGraph(jsonTEXT, map);  		    
		    }
	});
}

//Draws Graph
function drawGraph(data, map2) {
	// data = JSON.parse(jsonObject); 
	const LAT_INDEX = 0; 
	const LONG_INDEX = 1;

	var overlay = new google.maps.OverlayView(); 
	
	overlay.onAdd = function() {
		// alert("lat: " + JSON.stringify(data[0]['lat']));
		// alert("long: " + JSON.stringify(data[0]['theLong']));  

		var layer = d3.select(this.getPanes().overlayLayer).append("div")
			.attr("class", "stations"); 
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
				.attr("r", function(d){
					if(d.value['average']<1.00) {
						return 2.0; 
					}
					else if(d.value['average']<2.00) {
						return 3.0; 
					}
					else if(d.value['average']<4.00) {
						return 4.0; 
					}
					else if(d.value['average']<5.00) {
						return 4.8; 
					}
					else if(d.value['average']<8.00) {
						return 5.0; 
					}
					else {
						return 8.0; 
					}
				;})
				.attr("cx", padding)
				.attr("cy", padding); 

			function transform(d) {
				// console.log("enters"); 
				// alert("the lat is: " + d.value['lat'] + " the long is: " + d.value['theLong']);
				
				d = new google.maps.LatLng(d.value['lat'], d.value['theLong']); 
				d = projection.fromLatLngToDivPixel(d); 
				return d3.select(this)
					.style("left",(d.x-padding) + "px")
					.style("top", (d.y - padding) + "px"); 
			} //closes transform
		}; //closes draw
	};  //closes onAdd
	overlay.setMap(map2); 
}

//Reads in CSV, has Lat-Longs & combines very similar addresses 
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

			//if both lat & long exist, then check keywords 
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
	//Now recalibrate all items within Map, & plot each dot!
	for(var i=0; i<latLongPairMap.size; i++) {
			latLongPairMap.next();
			//finds max, avg, & sum of each set
			var theSet = latLongPairMap.value(); 
			// for (int z=0; z<theSet.size(); z++) {
			// 	alert(theSet.getElements()[z]); 
			// }
			theSet.recalibrate(THE_KEYWORD_MAP); 
	}
	console.log(latLongPairMap); 
	console.log(JSON.stringify(latLongPairMap.listValues())); 
	return latLongPairMap.listValues(); 

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

//go through entire "bag," & recalculate averages 
Set.prototype.recalibrate = function(KEYWORD_MAP) {
	//could do in add/union function instead...
	for(var i=0; i<this.bag_.length; i++) {
		// alert("recalibrating at index: " + i); 
		var toLookUp = this.bag_[i].toLowerCase().trim(); 
		alert("this is what I am looking up: " + toLookUp); 
		var keywordValue = KEYWORD_MAP.get(toLookUp);
		this.sum += keywordValue;
		if(this.max<keywordValue) {
			this.max = keywordValue;
		}
	}
	this.average = this.sum/this.bag_.length; 
	// alert("my average is: " + this.average + "; & my sum is: " + this.sum + "; & my max is: " + this.max); 
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

//put "no keywords" as 0.00
//NB: This follows List Changes document
function KeyWordValues() {
	var theMap = new Map;
	theMap.put('accessories', 0.1)
	.put('accountants', 0.1)
	.put('active life', 0.1)
	.put('acupuncture', 0.1)
	.put('adult education', 0.1)
	.put('adult entertainment', 0.1)
	.put('adult', 0.1)
	.put('advertising', 0.1)
	.put('afghan', 0.1)
	.put('african', 0.1)
	.put('airlines', 0.1)
	.put('airport shuttles', 0.1)
	.put('airports', 0.1)
	.put('allergists', 0.1)
	.put('altoatesine', 0.1)
	.put('amateur sports teams', 0.1)
	.put('american', 0.1)
	.put('amusement parks', 0.1)
	.put('anesthesiologists', 0.11)
	.put('animal shelters', 0.17)
	.put('antiques', 0.25)
	.put('apartments', 0.3)
	.put('appliances', 0.3)
	.put('appliances & repair', 0.39)
	.put('apulian', 0.4)
	.put('aquariums', 0.4)
	.put('arabian', 0.43)
	.put('arcades', 0.47)
	.put('archery', 0.47)
	.put('architects', 0.5)
	.put('argentine', 0.52)
	.put('armenian', 0.52)
	.put('art galleries', 0.53)
	.put('art schools', 0.54)
	.put('art supplies', 0.54)
	.put('arts & crafts', 0.54)
	.put('arts & entertainment', 0.54)
	.put('asian fusion', 0.54)
	.put('psychics & astrologers', 1.57)
	.put('auction houses', 0.55)
	.put('audiologist', 0.57)
	.put('australian', 0.57)
	.put('asutrian', 0.57)
	.put('authorized postal representative', 0.58)
	.put('auto detailing', 0.58)
	.put('auto glass services', 0.58)
	.put('auto loan providers', 0.58)
	.put('auto parts & supplies', 0.58)
	.put('auto repair', 0.59)
	.put('automotive', 0.6)
	.put('baby gear & furniture', 0.6)
	.put('baden', 0.61)
	.put('badminton', 0.61)
	.put('bagels', 0.61)
	.put('baguettes', 0.64)
	.put('bail bondsmen', 0.64)
	.put('bakeries', 0.64)
	.put('opera & ballet', 1.3)
	.put('bangladeshi', 0.64)
	.put('bankruptcy law', 0.64)
	.put('banks & credit unions', 0.65)
	.put('barbeque', 0.65)
	.put('barbers', 0.66)
	.put('barre classes', 0.66)
	.put('bars', 0.66)
	.put('bartenders', 0.66)
	.put('basque', 0.66)
	.put('bathing area', 0.66)
	.put('bavarian', 0.66)
	.put('beach bars', 0.67)
	.put('beaches', 0.67)
	.put('beauty & spas', 0.68)
	.put('bed & breakfast', 0.68)
	.put('beer bar', 0.68)
	.put('beer garden', 0.68)
	.put('beer gardens', 0.69)
	.put('beer hall', 0.7)
	.put('beer wine & spirits', 0.7)
	.put('belgian', 0.7)
	.put('bespoke clothing', 0.71)
	.put('betting centers', 0.71)
	.put('beverage store', 0.71)
	.put('bicycle paths', 0.72)
	.put('bicycles', 0.72)
	.put('bike associations', 0.72)
	.put('bike repair/maintenance', 0.72)
	.put('bike rentals', 0.72)
	.put('bike shop', 0.73)
	.put('bikes', 0.73)
	.put('bistros', 0.73)
	.put('black sea', 0.73)
	.put('blow dry/out services', 0.73)
	.put('boat charters', 0.73)
	.put('boat dealers', 0.74)
	.put('boat repair', 0.74)
	.put('boating', 0.74)
	.put('body shops', 0.74)
	.put('bookstores', 0.75)
	.put('boot camps', 0.75)
	.put('botanical gardens', 0.76)
	.put('bowling', 0.76)
	.put('boxing', 0.76)
	.put('brasseries', 0.76)
	.put('brazilian', 0.76)
	.put('breakfast & brunch', 0.77)
	.put('breweries', 0.77)
	.put('bridal', 0.77)
	.put('british', 0.77)
	.put('bubble tea', 0.77)
	.put('buddhist temples', 0.77)
	.put('buffets', 0.78)
	.put('building supplies', 0.78)
	.put('bulgarian', 0.78)
	.put('bulk billing', 0.78)
	.put('bungee jumping', 0.78)
	.put('burgers', 0.78)
	.put('burmese', 0.79)
	.put('business law', 0.8)
	.put('butcher', 0.8)
	.put('cafes', 0.8)
	.put('cafeteria', 0.81)
	.put('cajun/creole', 0.81)
	.put('patisserie/cake shop', 1.46)
	.put('calabrian', 0.81)
	.put('cambodian', 0.81)
	.put('campgrounds', 0.83)
	.put('canadian ', 0.83)
	.put('candy stores', 0.83)
	.put('cannabis clinics', 0.83)
	.put('canteen', 0.83)
	.put('cantonese', 0.84)
	.put('car dealers', 0.84)
	.put('car rental', 0.85)
	.put('gas & service stations', 1.05)
	.put('car stereo installation', 0.85)
	.put('car wash', 0.85)
	.put('cardiologists', 0.85)
	.put('cards & stationery', 0.86)
	.put('career counseling', 0.86)
	.put('caribbean', 0.86)
	.put('carpenters', 0.87)
	.put('carpet cleaning', 0.87)
	.put('carpet installation', 0.87)
	.put('carpeting', 0.87)
	.put('casinos', 0.88)
	.put('castles', 0.88)
	.put('catalan', 0.88)
	.put('caterers', 0.88)
	.put('funeral services & cemeteries', 1.06)
	.put('champagne bars', 0.89)
	.put('check cashing/pay-day loans', 0.9)
	.put('chee kufta', 0.9)
	.put('cheese shops', 0.9)
	.put('cheesesteaks', 0.9)
	.put('chicken shop', 0.9)
	.put('chicken wings', 0.9)
	.put('child care & day care', 0.96)
	.put('chinese bazaar', 0.91)
	.put('chinese', 0.92)
	.put('chiropractors', 0.92)
	.put('chocolatiers & shops', 0.92)
	.put('choirs', 0.92)
	.put('christmas markets', 0.93)
	.put('churches', 0.93)
	.put('churros', 0.93)
	.put('cinema', 0.93)
	.put('circus schools', 0.93)
	.put('climbing', 0.93)
	.put('children\'s clothing', 0.93)
	.put('men\'s clothing', 0.94)
	.put('women\'s clothing', 0.94)
	.put('clowns', 0.94)
	.put('cocktail bars', 0.94)
	.put('coffee & tea', 0.94)
	.put('coffeeshops', 0.95)
	.put('college counseling', 0.95)
	.put('colleges & universities', 0.95)
	.put('colombian', 0.95)
	.put('comedy clubs', 0.95)
	.put('comfort food', 0.95)
	.put('comic books', 0.96)
	.put('commercial real estate', 0.96)
	.put('community centers', 0.96)
	.put('computers', 0.97)
	.put('concept shops', 0.97)
	.put('contractors', 0.97)
	.put('convenience stores', 0.97)
	.put('cooking schools', 0.98)
	.put('corsican', 0.98)
	.put('cosmetic dentists', 0.98)
	.put('cosmetic surgeons', 0.98)
	.put('cosmetics & beauty supply', 0.99)
	.put('cosmetology schools', 0.99)
	.put('costumes', 0.99)
	.put('country dance halls', 0.99)
	.put('courthouses', 1)
	.put('cpr classes', 1)
	.put('creperies', 1)
	.put('criminal defense law', 1)
	.put('embroidery & crochet', 1.05)
	.put('csa', 1)
	.put('cuban', 1.01)
	.put('cucina campana', 1.01)
	.put('cultural center', 1.01)
	.put('curry sausage', 1.01)
	.put('cypriot', 1.01)
	.put('czech/slovakian', 1.01)
	.put('dance clubs', 1.01)
	.put('dance restaurants', 1.01)
	.put('dance schools', 1.01)
	.put('dance studios', 1.01)
	.put('danish', 1.01)
	.put('data recovery', 1.02)
	.put('day spas', 1.02)
	.put('delicatessen', 1.02)
	.put('delis', 1.02)
	.put('couriers & delivery services', 1.01)
	.put('dental hygienists', 1.02)
	.put('dentists', 1.03)
	.put('department stores', 1.03)
	.put('departments of motor vehicles', 1.03)
	.put('dermatologists', 1.03)
	.put('desserts', 1.04)
	.put('diagnostic imaging', 1.04)
	.put('diagnostic services', 1.04)
	.put('dim sum', 1.04)
	.put('diners', 1.04)
	.put('disc golf', 1.04)
	.put('discount store', 1.04)
	.put('dive bars', 1.04)
	.put('diving', 1.05)
	.put('divorce & family law', 1.05)
	.put('djs', 1.05)
	.put('do-it-yourself food', 1.05)
	.put('doctors', 1.05)
	.put('dog parks', 1.05)
	.put('dog walkers', 1.05)
	.put('dolmus station', 1.05)
	.put('dominican', 1.05)
	.put('donairs', 1.05)
	.put('donuts', 1.06)
	.put('driving schools', 1.06)
	.put('drugstores', 1.06)
	.put('dry cleaning & laundry', 1.06)
	.put('dui law', 1.06)
	.put('music & dvds', 1.45)
	.put('ear nose & throat doctor', 1.07)
	.put('eastern european', 1.07)
	.put('eastern german', 1.08)
	.put('editorial services', 1.08)
	.put('education', 1.08)
	.put('educational services', 1.09)
	.put('egyptian', 1.09)
	.put('electricians', 1.09)
	.put('electronics', 1.1)
	.put('electronics repair', 1.1)
	.put('elementary schools', 1.1)
	.put('embassy', 1.11)
	.put('emilian', 1.11)
	.put('employment agencies', 1.11)
	.put('employment law', 1.12)
	.put('endodontists', 1.12)
	.put('estate planning law', 1.12)
	.put('ethiopian', 1.12)
	.put('ethnic food', 1.13)
	.put('ethic grocery', 1.13)
	.put('event photography', 1.14)
	.put('event planning & services', 1.14)
	.put('experiences', 1.14)
	.put('eyelash service', 1.14)
	.put('eyewear & opticians', 1.14)
	.put('fabric stores', 1.15)
	.put('family practice', 1.15)
	.put('farmers market', 1.15)
	.put('fashion', 1.15)
	.put('fasil music', 1.16)
	.put('fast food', 1.16)
	.put('ferries', 1.17)
	.put('fertility', 1.17)
	.put('festivals', 1.17)
	.put('filipino', 1.17)
	.put('video/film production', 6.82)
	.put('financial advising', 1.18)
	.put('financial services', 1.18)
	.put('fire departments', 1.18)
	.put('fireworks', 1.18)
	.put('first aid classes', 1.19)
	.put('fish & chips', 1.19)
	.put('fishing', 1.19)
	.put('flea markets', 1.19)
	.put('flight instruction', 1.19)
	.put('flooring', 1.19)
	.put('florists', 1.2)
	.put('flowers', 1.2)
	.put('flowers & gifts', 1.2)
	.put('fondue', 1.2)
	.put('food', 1.2)
	.put('food court', 1.21)
	.put('food delivery services', 1.21)
	.put('food stands', 1.21)
	.put('food trucks', 1.21)
	.put('formal wear', 1.21)
	.put('framing', 1.21)
	.put('free diving', 1.21)
	.put('french', 1.21)
	.put('french southwest', 1.22)
	.put('friterie', 1.22)
	.put('friulan', 1.22)
	.put('ice cream & frozen yogurt', 1.32)
	.put('fruits & veggies', 1.23)
	.put('fun fair', 1.23)
	.put('furniture reupholstery', 1.23)
	.put('furniture stores', 1.23)
	.put('fuzhou', 1.24)
	.put('galician', 1.24)
	.put('garage door services', 1.24)
	.put('gardeners', 1.24)
	.put('nurseries & gardening', 1.57)
	.put('gastroenterologist', 1.25)
	.put('gastropubs', 1.25)
	.put('gay bars', 1.25)
	.put('gelato', 1.25)
	.put('general dentistry', 1.25)
	.put('general festivals', 1.25)
	.put('general litigation', 1.25)
	.put('georgian', 1.26)
	.put('german', 1.26)
	.put('gerontologists', 1.27)
	.put('giblets', 1.27)
	.put('gift shops', 1.27)
	.put('gliding', 1.27)
	.put('gluten-free', 1.28)
	.put('go karts', 1.28)
	.put('golf', 1.28)
	.put('golf equipment', 1.28)
	.put('golf equipment shops', 1.28)
	.put('public services & government', 1.95)
	.put('gozleme', 1.28)
	.put('graphic design', 1.28)
	.put('greek', 1.28)
	.put('grocery', 1.29)
	.put('guest houses', 1.29)
	.put('gun/rifle ranges', 2.08)
	.put('guns & ammo', 1.29)
	.put('gymnastics', 1.29)
	.put('gyms', 1.3)
	.put('hair extensions', 1.3)
	.put('hair removal', 1.3)
	.put('hair salon for men', 1.3)
	.put('hair salons', 1.3)
	.put('hair stylists', 1.3)
	.put('haitian', 1.3)
	.put('hakka', 1.31)
	.put('halal', 1.31)
	.put('handyman', 1.32)
	.put('hang gliding', 1.33)
	.put('hardware stores', 1.33)
	.put('hats', 1.33)
	.put('hawaiian', 1.33)
	.put('health & medical', 1.33)
	.put('storefront clinic', 1.33)
	.put('health markets', 1.34)
	.put('hearing aid providers', 1.34)
	.put('hearing aids', 1.34)
	.put('heating & air conditioning/HVAC', 1.38)
	.put('henghwa', 1.34)
	.put('herbs & spices', 1.34)
	.put('hessian', 1.34)
	.put('middle schools and high schools', 1.54)
	.put('hiking', 1.34)
	.put('himalayan/nepalese', 1.35)
	.put('hindu temples', 1.35)
	.put('landmarks & historical buildings', 1.45)
	.put('hobby shops', 1.35)
	.put('hokkien', 1.35)
	.put('naturopathic/holistic', 1.605)
	.put('home & garden', 1.36)
	.put('home cleaning', 1.36)
	.put('home decor', 1.36)
	.put('home health care', 1.37)
	.put('home inspectors', 1.37)
	.put('home organization', 1.37)
	.put('home services', 1.37)
	.put('home staging', 1.37)
	.put('home theatre installation', 1.37)
	.put('home window tinting', 1.37)
	.put('hookah bars', 1.38)
	.put('horse boarding', 1.38)
	.put('horse racing', 1.38)
	.put('horseback riding', 1.38)
	.put('hospice', 1.39)
	.put('hospitals', 1.39)
	.put('hostels', 1.39)
	.put('hot air balloons', 1.39)
	.put('hot dogs', 1.4)
	.put('hot pot', 1.4)
	.put('hot tub & pool', 1.41)
	.put('hotel bar', 1.41)
	.put('hungarian', 1.41)
	.put('iberian', 1.42)
	.put('immigration law', 1.43)
	.put('indian', 1.43)
	.put('indonesian', 1.43)
	.put('indoor playcentre', 1.43)
	.put('fitness & instruction', 1.32)
	.put('insurance', 1.44)
	.put('interior design', 1.44)
	.put('internal medicine', 1.44)
	.put('international', 1.45)
	.put('internet cafes', 1.45)
	.put('internet service providers', 1.45)
	.put('investing', 1.45)
	.put('irish pub', 1.45)
	.put('irish', 1.45)
	.put('irrigation', 1.45)
	.put('isl& pub', 1.46)
	.put('israeli', 1.46)
	.put('it services & computer repair', 1.22)
	.put('italian', 1.47)
	.put('izakaya', 1.47)
	.put('japanese', 1.47)
	.put('jazz & blues', 1.47)
	.put('jewelry', 1.47)
	.put('jewelry repair', 1.47)
	.put('jewish', 1.47)
	.put('junk removal & hauling', 1.48)
	.put('karaoke', 1.48)
	.put('kebab', 1.49)
	.put('Keyword', 1.49)
	.put('kids activities', 1.5)
	.put('kiosk', 1.5)
	.put('kitchen & bath', 1.5)
	.put('kiteboarding', 1.5)
	.put('knitting supplies', 1.52)
	.put('korean', 1.52)
	.put('kosher', 1.52)
	.put('kurdish', 1.52)
	.put('laboratory testing', 1.53)
	.put('lactation services', 1.53)
	.put('lakes', 1.54)
	.put('landscape architects', 1.54)
	.put('landscaping', 1.55)
	.put('language schools', 1.55)
	.put('laos', 1.55)
	.put('laotian', 1.55)
	.put('laser eye surgery/lasik', 1.57)
	.put('laser hair removal', 1.57)
	.put('laser tag', 1.58)
	.put('latin american', 1.58)
	.put('lawn bowling', 1.59)
	.put('lawyers', 1.59)
	.put('leather goods', 1.59)
	.put('lebanese', 1.59)
	.put('leisure centers', 1.59)
	.put('libraries', 1.59)
	.put('life coach', 1.6)
	.put('lighting fixtures & equipment', 1.61)
	.put('ligurian', 1.62)
	.put('limos', 1.63)
	.put('linens', 1.63)
	.put('lingerie', 1.63)
	.put('live/raw food', 1.63)
	.put('local flavor', 1.63)
	.put('local services', 1.63)
	.put('keys & locksmiths', 1.57)
	.put('lounges', 1.64)
	.put('luggage', 1.64)
	.put('lumbard', 1.64)
	.put('lyonnais', 1.65)
	.put('magicians', 1.65)
	.put('makeup artists', 1.65)
	.put('malaysian', 1.66)
	.put('mamak', 1.67)
	.put('marching bands', 1.67)
	.put('market stalls', 1.67)
	.put('marketing', 1.68)
	.put('martial arts', 1.69)
	.put('masonry/concrete', 1.69)
	.put('mass media', 1.7)
	.put('massage', 1.7)
	.put('massage schools', 1.7)
	.put('massage therapy', 1.7)
	.put('matchmakers', 1.7)
	.put('maternity wear', 1.7)
	.put('mattresses', 1.71)
	.put('meat shops', 1.71)
	.put('meatballs', 1.71)
	.put('medical centers', 1.71)
	.put('medical spas', 1.71)
	.put('medical supplies', 1.72)
	.put('medical transportation', 1.72)
	.put('mediterranean', 1.72)
	.put('counseling & mental health', 6.93)
	.put('mexican', 1.73)
	.put('middle eastern', 1.74)
	.put('midwives', 1.75)
	.put('milk bars', 1.75)
	.put('mini golf', 1.75)
	.put('mobile clinics', 1.75)
	.put('mobile phone repair', 1.76)
	.put('mobile phones', 1.76)
	.put('modern australian', 1.76)
	.put('modern european', 1.77)
	.put('mongolian', 1.77)
	.put('moroccan', 1.78)
	.put('mortgage brokers', 1.78)
	.put('mosques', 1.78)
	.put('motorcycle dealers', 1.79)
	.put('motorcycle gear', 1.79)
	.put('motorcycle rental', 1.79)
	.put('motorcycle repair', 1.8)
	.put('mountain biking', 1.8)
	.put('movers', 1.8)
	.put('mulled wine', 1.82)
	.put('museums', 1.82)
	.put('music venues', 1.84)
	.put('musicians', 1.85)
	.put('nail salons', 1.86)
	.put('neurologist', 1.86)
	.put('new zeal&', 1.86)
	.put('newspapers & magazines', 1.14)
	.put('night food', 1.86)
	.put('nightlife', 1.86)
	.put('community service/non-profit', 1.42)
	.put('no keywords', 0.00)
	.put('northern german', 1.88)
	.put('notaries', 1.88)
	.put('nudist', 1.89)
	.put('nutritionists', 1.89)
	.put('nyonya', 1.89)
	.put('obstetricians & gynecologists', 1.9)
	.put('occupational therapy', 1.9)
	.put('office cleaning', 1.91)
	.put('office equipment', 1.91)
	.put('officiants', 1.92)
	.put('oil change stations', 1.92)
	.put('oncologist', 1.92)
	.put('open sandwiches', 1.92)
	.put('ophthalmologists', 1.93)
	.put('optometrists', 1.93)
	.put('oral surgeons', 1.94)
	.put('organic stores', 1.94)
	.put('oriental', 1.95)
	.put('orthodontists', 1.96)
	.put('orthopedists', 1.96)
	.put('osteopathic physicians', 1.96)
	.put('osteopaths', 1.98)
	.put('outdoor gear', 1.98)
	.put('outlet stores', 1.99)
	.put('paddleboarding', 1.99)
	.put('arroceria / paella', 1.27)
	.put('paintball', 2)
	.put('painters', 2)
	.put('pakistani', 2.02)
	.put('palatine', 2.02)
	.put('parent cafes', 2.02)
	.put('parking', 2.02)
	.put('parks', 2.05)
	.put('parma', 2.07)
	.put('party & event planning', 2.08)
	.put('party bus rentals', 2.1)
	.put('party equipment rentals', 2.1)
	.put('party supplies', 2.11)
	.put('pawn shops', 2.13)
	.put('pediatric dentists', 2.13)
	.put('pediatricians', 2.13)
	.put('performing arts', 2.14)
	.put('perfume', 2.16)
	.put('periodontists', 2.16)
	.put('permanent makeup', 2.19)
	.put('persian/iranian', 2.19)
	.put('personal assistants', 2.2)
	.put('personal chefs', 2.21)
	.put('personal injury law', 2.21)
	.put('personal shopping', 2.22)
	.put('peruvian', 2.23)
	.put('pest control', 2.23)
	.put('pet boarding/pet sitting', 2.25)
	.put('pet groomers', 2.24)
	.put('pet services', 2.26)
	.put('pet stores', 2.26)
	.put('pet training', 2.26)
	.put('pets', 2.26)
	.put('pharmacy', 2.28)
	.put('photographers', 2.29)
	.put('photography stores & services', 2.3)
	.put('physical therapy', 2.31)
	.put('piano bars', 2.31)
	.put('piercing', 2.33)
	.put('pierogis', 2.33)
	.put('pilates', 2.34)
	.put('pita', 2.35)
	.put('pizza', 2.35)
	.put('playgrounds', 2.36)
	.put('plumbing', 2.37)
	.put('plus size fashion', 2.38)
	.put('podiatrists', 2.38)
	.put('police departments', 2.38)
	.put('polish', 2.38)
	.put('pool cleaners', 2.39)
	.put('pool halls', 2.39)
	.put('pop-up shops', 2.4)
	.put('portuguese', 2.41)
	.put('post offices', 2.41)
	.put('potatoes', 2.42)
	.put('poutineries', 2.44)
	.put('preschools', 2.45)
	.put('pretzels', 2.5)
	.put('print media', 2.53)
	.put('printing services', 2.53)
	.put('private investigation', 2.54)
	.put('private schools', 2.56)
	.put('private tutors', 2.57)
	.put('proctologists', 2.58)
	.put('professional services', 2.58)
	.put('professional sports teams', 2.58)
	.put('property management', 2.59)
	.put('psychiatrists', 2.59)
	.put('pub food', 2.59)
	.put('public plazas', 2.6)
	.put('public relations', 2.61)
	.put('public transportation', 2.62)
	.put('pubs', 2.63)
	.put('puerto rican', 2.63)
	.put('pulmonologist', 2.64)
	.put('race tracks', 2.67)
	.put('radio stations', 2.69)
	.put('rafting/kayaking', 2.09)
	.put('ramen', 2.72)
	.put('real estate', 2.72)
	.put('real estate agents', 2.74)
	.put('real estate law', 2.74)
	.put('real estate services', 2.77)
	.put('record labels', 2.78)
	.put('recreation centers', 2.78)
	.put('recycling center', 2.79)
	.put('reflexology', 2.8)
	.put('registry office', 2.8)
	.put('rehabilitation center', 2.8)
	.put('recording & rehearsal studios', 2.80)
	.put('religious organizations', 2.84)
	.put('religious schools', 2.85)
	.put('resorts', 2.85)
	.put('restaurants', 2.85)
	.put('retirement homes', 2.86)
	.put('rhinelandian', 2.87)
	.put('rice', 2.87)
	.put('rock climbing', 2.89)
	.put('rolfing', 2.9)
	.put('roman', 2.9)
	.put('romanian', 2.9)
	.put('roofing', 2.92)
	.put('rotisserie chicken', 2.93)
	.put('rumanian', 2.93)
	.put('russian', 2.94)
	.put('rv dealers', 2.98)
	.put('rv parks', 2.99)
	.put('rv rental', 2.99)
	.put('sailing', 3)
	.put('salad', 3.01)
	.put('salvadoran', 3.03)
	.put('sandwiches', 3.04)
	.put('sardinian', 3.05)
	.put('saunas', 3.09)
	.put('scandinavian design', 3.1)
	.put('scandinavian', 3.12)
	.put('scottish', 3.14)
	.put('scuba diving', 3.16)
	.put('seafood', 3.16)
	.put('seafood markets', 3.17)
	.put('security services', 3.18)
	.put('security systems', 3.19)
	.put('self storage', 3.21)
	.put('senegalese', 3.22)
	.put('serbo croatian', 3.25)
	.put('session photography', 3.25)
	.put('sewing & alterations', 3.27)
	.put('shades & blinds', 3.31)
	.put('shanghainese', 3.32)
	.put('shared office spaces', 3.32)
	.put('shaved ice', 3.35)
	.put('shipping centers', 3.4)
	.put('shoe repair', 3.4)
	.put('shoe stores', 3.41)
	.put('shopping', 3.43)
	.put('shopping centers', 3.45)
	.put('sicilian', 3.46)
	.put('signature cuisine', 3.48)
	.put('singaporean', 3.48)
	.put('skate parks', 3.51)
	.put('skating rinks', 3.55)
	.put('ski resorts', 3.56)
	.put('skiing', 3.57)
	.put('skin care', 3.64)
	.put('skydiving', 3.65)
	.put('sleepwear', 3.66)
	.put('smog check stations', 3.7)
	.put('juice bars & smoothies', 2.60)
	.put('snow removal', 3.71)
	.put('soccer', 3.72)
	.put('social clubs', 3.74)
	.put('solar installation', 3.74)
	.put('soul food', 3.76)
	.put('soup', 3.78)
	.put('south african', 3.79)
	.put('southern', 3.79)
	.put('souvenir shops', 3.8)
	.put('spanish', 3.8)
	.put('special bikes', 3.83)
	.put('special education', 3.85)
	.put('specialty food', 3.86)
	.put('specialty schools', 3.91)
	.put('speech therapists', 3.97)
	.put('spin classes', 4.02)
	.put('spiritual shop', 4.03)
	.put('sport equipment hire', 4.03)
	.put('sporting goods', 4.14)
	.put('sports bars', 4.16)
	.put('sports clubs', 4.2)
	.put('sports medicine', 4.23)
	.put('sports wear', 4.25)
	.put('squash', 4.25)
	.put('stadiums & arenas', 4.32)
	.put('steakhouses', 4.41)
	.put('street art', 4.43)
	.put('street vendors', 4.45)
	.put('summer camps', 4.47)
	.put('surf shop', 4.5)
	.put('surfing', 4.55)
	.put('surgeons', 4.67)
	.put('sushi bars', 4.7)
	.put('swabian', 4.72)
	.put('swedish', 4.75)
	.put('swimming lessons/schools', 4.78)
	.put('swimming pools', 4.78)
	.put('swimwear', 4.81)
	.put('swiss food', 4.83)
	.put('synagogues', 4.84)
	.put('szechuan', 4.86)
	.put('screen printing/t-shirt printing', 4.03)
	.put('tabernas', 4.91)
	.put('tablao flamenco', 5)
	.put('tableware', 5.01)
	.put('tai chi', 5.02)
	.put('taiwanese', 5.11)
	.put('talent agencies', 5.19)
	.put('tanning', 5.2)
	.put('tapas bars', 5.22)
	.put('tapas/small plates', 5.32)
	.put('tattoo', 5.32)
	.put('tattoo removal', 5.32)
	.put('tax office', 5.34)
	.put('tax services', 5.34)
	.put('taxidermy', 5.41)
	.put('taxis', 5.46)
	.put('tea rooms', 5.47)
	.put('musical instruments & teachers', 3.68)
	.put('television service providers', 5.53)
	.put('television stations', 5.54)
	.put('tennis', 5.6)
	.put('teochew', 5.67)
	.put('teppanyaki', 5.71)
	.put('test preparation', 5.73)
	.put('tex-mex', 5.78)
	.put('thai', 5.84)
	.put('thrift stores', 5.97)
	.put('ticket sales', 5.97)
	.put('tickets', 6.02)
	.put('tires', 6.08)
	.put('tobacco shops', 6.12)
	.put('tours', 6.13)
	.put('towing', 6.15)
	.put('toy stores', 6.16)
	.put('trade fairs', 6.24)
	.put('traditional chinese medicine', 6.29)
	.put('traditional norwegian', 6.3)
	.put('traditional swedish', 6.36)
	.put('train stations', 6.46)
	.put('trainers', 6.58)
	.put('trampoline parks', 6.61)
	.put('translation services', 6.62)
	.put('transportation', 6.73)
	.put('hotels & travel', 4.17)
	.put('travel services', 7.05)
	.put('tree services', 7.07)
	.put('trinidadian', 7.08)
	.put('trophy shops', 7.16)
	.put('truck rental', 7.22)
	.put('tubing', 7.46)
	.put('turkish ravioli', 7.59)
	.put('turkish', 7.71)
	.put('tuscan', 7.91)
	.put('tutoring centers', 8.19)
	.put('ukrainian', 8.29)
	.put('uniforms', 8.43)
	.put('university housing', 8.44)
	.put('urgent care', 8.72)
	.put('urologists', 8.79)
	.put('used bookstore', 9.05)
	.put('used vintage & consignment', 9.07)
	.put('utilities', 9.24)
	.put('vacation rental agents', 9.69)
	.put('vacation rentals', 9.74)
	.put('vegan', 10.11)
	.put('vegetarian', 10.19)
	.put('venetian', 10.21)
	.put('venezuelan', 10.23)
	.put('venison', 10.38)
	.put('venues & event spaces', 10.93)
	.put('veterinarians', 11.12)
	.put('books, mags, music & video', 3.98)
	.put('videos & video game rental', 3.17)
	.put('videographers', 12.72)
	.put('vietnamese', 13.19)
	.put('vinyl records', 13.2)
	.put('vocational & technical school', 9.405)
	.put('walk-in clinics', 13.34)
	.put('watch repair', 13.92)
	.put('watches', 13.94)
	.put('water taxis', 14.04)
	.put('web design', 14.22)
	.put('wedding planning', 14.41)
	.put('weight loss centers', 14.81)
	.put('wholesale stores', 14.94)
	.put('wigs', 15.32)
	.put('window washing', 15.33)
	.put('windows installation', 16.39)
	.put('windshield installation & repair', 17.79)
	.put('wine bars', 27.79)
	.put('wineries', 29.67)
	.put('wok', 66.89); 
	return theMap; 
}