import * as d3 from "d3"
import * as topojson from "topojson"


function init(sheets, vic, places) {

	const container = d3.select("#vicCoronaMapContainer")
	var isMobile;
	var windowWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

	if (windowWidth < 610) {
			isMobile = true;
	}	

	if (windowWidth >= 610){
			isMobile = false;
	}

	var width = document.querySelector("#vicCoronaMapContainer").getBoundingClientRect().width
	var height = width*0.7

	var projection = d3.geoMercator()
                    .center([145.5,-36.5])
                    .scale(width*5.8)
                    .translate([width/2,height/2])

	container.select("#vicMap").remove()

	var data = sheets.sheets.locations.filter(d => d.State == "VIC")

	var extent = d3.extent(sheets.sheets.locations, d => +d.Cases)
	console.log(extent)
	var lastUpdated = data[0].Date

	d3.select("#lastUpdated").text(lastUpdated)

	extent = [1,100]
	var mapData = d3.map(data, function(d) { return d.Location; });

	vic.objects['vic-lga-2019'].geometries.forEach(function(d) {
		console.log(d.properties.LGA_NAME19)
		// var entry = mapData.get(d.properties.LGA_NAME19)
		// console.log(entry['Cases'])
		if (mapData.has(d.properties.LGA_NAME19)) {
			var cases;
			if (mapData.get(d.properties.LGA_NAME19)['Cases'] == "1-4") {
				cases = 2
			}

			else {
				cases = +mapData.get(d.properties.LGA_NAME19)['Cases']
			}
			d.properties.cases = cases
		}

		else {
			d.properties.cases = 0
		}
		
	})

	console.log(data)

	var svg = container.append("svg")	
	                .attr("width", width)
					.attr("height", height)
	                .attr("id", "vicMap")
	                .attr("overflow", "hidden");

	var features = svg.append("g")

	var filterPlaces = places.features.filter(function(d){ 
		if (isMobile) {
			return d.properties.scalerank < 2	
		}

		else {
			return d.properties.scalerank < 4		
		}
		
	});

	var path = d3.geoPath()
	    .projection(projection);

	var geo = topojson.feature(vic,vic.objects['vic-lga-2019']).features    

	var centroids = geo.map(function (feature){
		// console.log(feature)
    	feature.properties['centroid'] = path.centroid(feature);
    	return feature.properties
  	});

	const radius = d3.scaleSqrt()
		.range([2, 20])

	radius.domain(extent)

	console.log(centroids)

	features.append("g")
	    .selectAll("path")
	    .attr("id","lgas")
	    .data(geo)
	    .enter().append("path")
	        .attr("class", "lga")
	        .attr("fill", "none")
	        .attr("stroke", "#bcbcbc")
	        .attr("data-tooltip","")
	        .attr("d", path);      

		 features.selectAll("text")
            .data(filterPlaces)
            .enter()
            .append("text")
            .text((d) => d.properties.name)
            .attr("x", (d) => projection([d.properties.longitude, d.properties.latitude])[0] + 20)
            .attr("y", (d) => projection([d.properties.longitude, d.properties.latitude])[1])
            .attr("text-anchor", "start")
            .attr("class","label")        


	var mapCircles1 = features.selectAll(".mapCircle")
						.data(centroids);	        

	mapCircles1					
		.enter()
		.append("circle")
		.attr("class", "mapCircle")
		.attr("title",d => d.LGA_NAME19)
		.attr("cx",d => d.centroid[0])
		.attr("cy",d => d.centroid[1])
		.attr("r", function(d) { 

			if (d.cases > 0) {
				return radius(d.cases) 

			}
			else {
				return 0
			}
		})    

   	container.select("#keyDiv svg").remove();

    var keySvg = container.select("#keyDiv").append("svg")	
	                .attr("width", 200)
					.attr("height", 100)
	                .attr("id", "key")
	                .attr("overflow", "hidden");

    keySvg.append("circle")
            .attr("cx",60)
			.attr("cy",50)
            .attr("class", "mapCircle")
            .attr("r", radius(extent[1])) 

     keySvg.append("text")
            .attr("x",60)
			.attr("y",90)
            .attr("class", "keyLabel")
            .attr("text-anchor", "middle")
            .text(extent[1])         

    // Little circle        

    keySvg.append("circle")
            .attr("cx",10)
			.attr("cy",50)
            .attr("class", "mapCircle")
            .attr("r", radius(extent[0]))

    keySvg.append("text")
            .attr("x",10)
			.attr("y",90)
            .attr("class", "keyLabel")
            .attr("text-anchor", "middle")
            .text(extent[0])

    keySvg.append("text")
            .attr("x",50)
			.attr("y",15)
            .attr("class", "keyLabel")
            .attr("text-anchor", "middle")
            .text("Number of cases")                 	


} // end init

const location = "docsdata"
const key = "1q5gdePANXci8enuiS4oHUJxcxC13d6bjMRSicakychE"

Promise.all([
		d3.json(`https://interactive.guim.co.uk/${location}/${key}.json`),
		d3.json('<%= path %>/assets/vic-lga-2019.json'),
		d3.json(`<%= path %>/assets/places_au.json`)
		])
		.then((results) =>  {
			init(results[0], results[1], results[2])
			var to=null
			var lastWidth = document.querySelector("#vicCoronaMapContainer").getBoundingClientRect()
			window.addEventListener('resize', function() {
				var thisWidth = document.querySelector("#vicCoronaMapContainer").getBoundingClientRect()
				if (lastWidth != thisWidth) {
					window.clearTimeout(to);
					to = window.setTimeout(function() {
						    init(results[0], results[1], results[2])
						}, 100)
				}
			
			})

});