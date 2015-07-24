var http = require("http");
var xml2js = require("xml2js");
var clc = require('cli-color');
var parser = new xml2js.Parser();

  interval = 10000, // 10 minutes
  busID = 83055;

  // Intitate
  getBuses(busID);

setInterval(function() {

  process.stdout.clearLine();  // clear current text
  process.stdout.cursorTo(0);

  getBuses(busID);
  
}, interval);

function getBuses(id){
  http.get("http://www.labs.skanetrafiken.se/v2.2/stationresults.asp?selPointFrKey=" + id, function(res) {

    var buffer = "";
    var lines = [];
    var bus_0 = [];
    var bus_1 = [];

    res.on("data", function (chunk) {
      buffer += chunk; 
    });
    
    res.on("end", function (e) {
      
      parser.parseString(buffer, function (e, result) {
        lines = result["soap:Envelope"]["soap:Body"][0]["GetDepartureArrivalResponse"][0]["GetDepartureArrivalResult"][0]["Lines"][0]["Line"];
        
        for(var i = 0; i < lines.length; i++){
          if(lines[i].StopPoint[0] == "A"){
            bus_0.push(lines[i]);
          }else if(lines[i].StopPoint[0] == "B"){
            bus_1.push(lines[i]);
          }      
        }

        console.log("[-> " + bus_0[0].Towards + "]: "+ bus_0[0].JourneyDateTime);
        console.log("[-> " + bus_1[0].Towards + "]: "+ bus_1[0].JourneyDateTime);

      });

    });

  }).on("error", function(e) {
    console.log("Got error: " + e.message);
  });
}