function startThis(map) {
	// var myNewObject = [{"lat": 40.8157246, "keywords": "laboratory testing", "long": -73.9601383, "time": "04:49PM Sunday, June 30, 2013"}, {"lat": 40.8155555, "keywords": "self storage", "long": -73.9655555, "time": "04:49PM Sunday, June 30, 2013"},{"lat": 40.8157246, "keywords": "japanese restaurant", "long": -73.9601383, "time": "04:49PM Monday, June 30, 2013"}]; 
	// var theJSON = latLongTrimmer(myNewObject); 
	// drawGraph(theJSON, map);  
	alert("the alert"); 
	$.ajax({	
	    url: "http://127.0.0.1:80/data/chrisR/2013-06-14T00:02:52.249Z/2013-07-04T18:02:52.249Z",
       	dataType: 'json',
	    success: function(data) {
	    	alert("entering the success"); 
	    	return;
	    }
	});
}

