import * as d3 from "d3"
import * as topojson from "topojson"


const infected = [3012,3021,3032,3038,3042,3046,3047,3055,3060,3064]

var maps = [{
	"label" : "Victoria",
	"centre" : [145.5,-36.5],
	"zoom" : 5.8,
	"active" : false
},{
	"label" : "Melbourne",
	"centre" : [145,-37.65],
	"zoom" : 28,
	"active" : true
}]

function init(dataFeed, vic, places, postcodes, population, trend) {

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

	var ratio = (maps[0].active) ? maps[0].zoom : maps[1].zoom

	var centre = (maps[0].active) ? maps[0].centre : maps[1].centre

	var projection = d3.geoMercator()
                    .center(centre)
                    .scale(width*ratio)
                    .translate([width/2,height/2])

	container.select("#vicMap").remove()
	container.select(".tooltip").remove()

	var data = dataFeed
	var extent = d3.extent(dataFeed, d => +d.count)

	// console.log(extent)
	var lastUpdated = data[0].date

	d3.select("#lastUpdated").text(lastUpdated)

	extent = [1,200]
	var mapData = d3.map(data, function(d) { return d.place; });
	var mapTrend = d3.map(trend, function(d) { return d.lga; });

	// console.log("trend",mapTrend)

	vic.objects['vic-lga-2019'].geometries.forEach(function(d) {
		// var entry = mapData.get(d.properties.LGA_NAME19)
		// console.log(entry['Cases'])
		if (mapData.has(d.properties.LGA_NAME19)) {
			var cases
			if (mapData.get(d.properties.LGA_NAME19)['count'] == "1-4") {
				cases = 2
				
			}

			else {
				cases = +mapData.get(d.properties.LGA_NAME19)['count']
				
	
			}
			d.properties.cases = cases
			if (cases > 0) {
					d.properties.casesPer100K = (cases / population[d.properties.LGA_NAME19]) * 100000
				}
			else {
				d.properties.casesPer100K = 0
			}
		}

		else {
			d.properties.cases = 0
			d.properties.casesPer100K = 0
		}


		if (mapTrend.has(d.properties.LGA_NAME19)) {
			d.properties.change = +mapTrend.get(d.properties.LGA_NAME19)['change']
			d.properties.this_week = +mapTrend.get(d.properties.LGA_NAME19)['this_week']
			d.properties.last_week = +mapTrend.get(d.properties.LGA_NAME19)['last_week']
		}

		else {
			d.properties.change = 0
			d.properties.this_week = 0
			d.properties.last_week = 0
		}
	})

	// console.log(data)

	// var extent = d3.extent(vic.objects['vic-lga-2019'].geometries, d => { 
	// 	if (d.properties.casesPer100K > 0) {
	// 		return d.properties.casesPer100K
	// 	}
	// })

	// console.log("extent",extent)

	var colors = d3.scaleLinear()
		.range(['#fee0d2','#a50f15'])
		.domain([0.5,50])

	var divColors = d3.scaleThreshold()
		.range(['#d73027','#f46d43','#fdae61','#fee090','#e0f3f8','#abd9e9','#74add1','#4575b4'].reverse())
		.domain([-1.5,-1,-0.5,0,0.5,1,1.5])

	function trendLang(slope) {
		if (slope > 0) {
			return "Increasing"
		}

		else if (slope < 0) {
			return "Decreasing"
		}

		else {
			return "Not enough cases"
		}
	}

	var svg = container.append("svg")	
	                .attr("width", width)
					.attr("height", height)
	                .attr("id", "vicMap")
	                .attr("overflow", "hidden")
	                .on("mousemove", tooltipMove)

	var tooltip = d3.select("#vicCoronaMapContainer").append("div")
            .attr("class", "tooltip")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("z-index", "20")
            .style("visibility", "hidden")
            .style("top", "30px")
            .style("left", "55px");                
              
	var defs = svg.append("defs")                

	defs
		.append("pattern")
		 .attr('id', 'diagonalHatch')
	    .attr('patternUnits', 'userSpaceOnUse')
	    .attr('width', 4)
	    .attr('height', 4)
	  .append('path')
	    .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
	    .attr('stroke', '#000000')
	    .attr('stroke-width', 1);



	var features = svg.append("g")

	var filterPlaces = places.features.filter(function(d){ 
		if (isMobile) {
			return d.properties.scalerank < 2	
		}

		else {
			return d.properties.scalerank < 4		
		}
		
	});

	function contains(a, b) {
	    // array matches
	    if (Array.isArray(b)) {
	        return b.some(x => a.indexOf(x) > -1);
	    }
	    // string match
	    return a.indexOf(b) > -1;
	}


	var path = d3.geoPath()
	    .projection(projection);

	var geo = topojson.feature(vic,vic.objects['vic-lga-2019']).features    
	var postcodeGeo = topojson.feature(postcodes,postcodes.objects.victoria).features

	var postcodeGeoLockdown = postcodeGeo.filter(pc => contains(infected, +pc.properties.postcode))

	// console.log("postcodeGeo", postcodeGeoLockdown)

	var centroids = geo.map(function (feature){
		// console.log(feature)
    	feature.properties['centroid'] = path.centroid(feature);
    	return feature.properties
  	});

	var rMax = 30

	if (width <= 900) {
		rMax = 20
	}

	if (width <= 620) {
		rMax = 15
	}

	

	const radius = d3.scaleSqrt()
		.range([2, rMax])

	radius.domain(extent)

	// console.log(centroids)

	features.append("g")
	    .selectAll("path")
	    .attr("id","lgas")
	    .data(geo)
	    .enter().append("path")
	        .attr("class", "lga")
	        .attr("fill", (d) => {
	        	
	        	// if (d.properties.change != 0) {
	        	// 	return divColors(d.properties.change)
	        	// }

	        	// else {
	        		return "#eaeaea"
	        	// }
	        })
	        .attr("stroke", "#bcbcbc")
	        .attr("data-tooltip","")
	        .attr("d", path)
	        .on("mouseover", tooltipIn)
            .on("mouseout", tooltipOut)
	        

	// features.append("g")
	//     .selectAll("path")
	//     .attr("id","postcodes")
	//     .data(postcodeGeoLockdown)
	//     .enter().append("path")
	//         // .attr("class", "diagonal-stripe-1")
	//         .attr("fill", "url(#diagonalHatch)")
	//         .attr("stroke", "#000")
	//         .attr("data-tooltip","")
	//         .attr("d", path);           


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
		.attr("cx",d => { 
			// console.log(d.LGA_NAME19)
			return d.centroid[0]
		})
		.attr("cy",d => d.centroid[1])
		.attr("fill", d => divColors(d.change))
		.attr("r", function(d) { 

			if (d.cases > 0) {
				return radius(d.cases) 

			}
			else {
				return 0
			}
		})    



   	d3.select("#keyDiv svg").remove();

   	var keyWidth = document.querySelector("#keyDiv").getBoundingClientRect().width - 20
   	// console.log(keyWidth)

    var keySvg = d3.select("#keyDiv").append("svg")	
	                .attr("width", keyWidth)
					.attr("height", 50)
	                .attr("id", "key")
	                .attr("overflow", "hidden");

	var keySquare = keyWidth / 8;
    var barHeight = 15
    var textHeight = 30            	

    // console.log(divColors.domain())

	divColors.range().forEach(function(d, i) {

        keySvg.append("rect")
            .attr("x", keySquare * i)
            .attr("y", 20)
            .attr("width", keySquare)
            .attr("height", barHeight)
            .attr("fill", d)
            .attr("stroke", "#dcdcdc")
    })
            
    divColors.domain().forEach(function(d, i) {

            keySvg.append("text")
            .attr("x", (i + 1) * keySquare)
            .attr("text-anchor", "middle")
            .attr("y", textHeight + 20)
            .attr("class", "keyLabel keyText")
            .text(d)
      
     
    })

    keySvg.append("text")
        .attr("x", keyWidth/2 + 5)
        .attr("text-anchor", "start")
        .attr("y", 16)
        .attr("class", "keyText keyLabel")
        .text("Cases increasing →")

    keySvg.append("text")
        .attr("x", keyWidth/2 - 5)
        .attr("text-anchor", "end")
        .attr("y", 16)
        .attr("class", "keyText keyLabel")
        .text("← Cases decreasing")    


    d3.select("#keyDiv2 svg").remove();

    var keyWidth2 = document.querySelector("#keyDiv2").getBoundingClientRect().width - 20

    var key2offset = 20

    var keySvg2 = d3.select("#keyDiv2").append("svg")	
	                .attr("width", keyWidth2)
					.attr("height", 80)
	                .attr("id", "key2")
	                .attr("overflow", "hidden");    

	keySvg2.append("circle")
            .attr("cx",60 + key2offset)
			.attr("cy",40)
            .attr("class", "keyCircle")
            .attr("r", radius(extent[1])) 

    keySvg2.append("text")
            .attr("x",60 + key2offset)
			.attr("y",45)
            .attr("class", "keyText keyLabel")
            .attr("text-anchor", "middle")
            .text(extent[1])         

    // Little circle        

    keySvg2.append("circle")
            .attr("cx",10 + key2offset)
			.attr("cy",31)
            .attr("class", "keyCircle")
            .attr("r", radius(1))

    keySvg2.append("text")
            .attr("x",10 +key2offset)
			.attr("y",45)
            .attr("class", "keyText keyLabel")
            .attr("text-anchor", "middle")
            .text(extent[0])               



    function tooltipMove(d) {
            var leftOffset = 0
            var rightOffset = 0
            var mouseX = d3.mouse(this)[0]
            var mouseY = d3.mouse(this)[1]
            var half = width / 2;
            
            if (mouseX < half) {
                d3.select("#tooltip").style("left", mouseX + "px");
                
            } else if (mouseX >= half) {
                d3.select("#tooltip").style("left", (mouseX - 200) + "px");
                
            }

            if (mouseY < (height / 2)) {
                d3.select("#tooltip").style("top", (mouseY + 30) + "px");
            } else if (mouseY >= (height / 2)) {
                d3.select("#tooltip").style("top", (mouseY - 120) + "px");
            }
            
        }

    function tooltipIn(d) {

            // console.log(d.properties)
            var html
            if (d.properties.change != 0) {
            	 html = `<b>${d.properties.LGA_NAME19}</b><br>
            			Trend: ${trendLang(d.properties.change)}<br>
            			Cases in past 7 days: ${d.properties.this_week}<br>
            			Cases in previous 7 day period: ${d.properties.last_week}<br>
            			Total in past 30 days: ${d.properties.cases}<br>
            			`
            }
           
           	else {
           		 html = `<b>${d.properties.LGA_NAME19}</b><br>
            			Trend: ${trendLang(d.properties.change)}<br>
            			Total in past 30 days: ${d.properties.cases}<br>
            			`
           	}

            d3.select(".tooltip").html(html).style("visibility", "visible");
        
        }

    function tooltipOut(d) {
        d3.select(".tooltip").style("visibility", "hidden");
    }            


} // end init


Promise.all([
		d3.json(`https://interactive.guim.co.uk/covidfeeds/victoria-month.json`),
		d3.json('<%= path %>/assets/vic-lga-2019.json'),
		d3.json(`<%= path %>/assets/places_au.json`),
		d3.json(`<%= path %>/assets/victoria.json`),
		d3.json(`<%= path %>/assets/population.json`),
		d3.json('https://interactive.guim.co.uk/2020/07/vic-corona-map/vicChange.json'),
		])
		.then((results) =>  {
			init(results[0], results[1], results[2], results[3], results[4], results[5])

			d3.select("#zoom2").on("click", function() {

				if (maps[0].active) {
					maps[0].active = false;
					maps[1].active = true;
					d3.select(this).html("Zoom to Victoria")
				} else {
					maps[0].active = true;
					maps[1].active = false;
					d3.select(this).html("Zoom to Melbourne")
				}

				init(results[0], results[1], results[2], results[3], results[4], results[5])

			})


			var to=null
			var lastWidth = document.querySelector("#vicCoronaMapContainer").getBoundingClientRect()
			window.addEventListener('resize', function() {
				var thisWidth = document.querySelector("#vicCoronaMapContainer").getBoundingClientRect()
				if (lastWidth != thisWidth) {
					window.clearTimeout(to);
					to = window.setTimeout(function() {
						    init(results[0], results[1], results[2], results[3], results[4], results[5])
						}, 100)
				}
			
			})

});