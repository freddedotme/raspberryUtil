var http = require("http");
var xml2js = require("xml2js");
var clc = require('cli-color');
var parser = new xml2js.Parser();

  var interval = 15000; // 10 minutes (ITS UNDER DEV, RELAX FFS!!!)
  var busID_0 = 83055;
  var busID_1 = 83054;

  var messages = [];

  // Intitate
  console.log('\033[2J');
  getBuses(busID_0, busID_1);
  getWeather();

setInterval(function() {

  console.log('\033[2J');
  getBuses(busID_0, busID_1);
  getWeather();

}, interval);

function getBuses(id0, id1){

  messages.length = 0;

  messages.push(clc.bold("Busstider"));
  messages.push("");

  http.get("http://www.labs.skanetrafiken.se/v2.2/stationresults.asp?selPointFrKey=" + id0, function(res) {

    var buffer = "";
    var lines = [];
    var station = "";
    var bus_0 = [];
    var bus_1 = [];

    res.on("data", function (chunk) {
      buffer += chunk; 
    });
    
    res.on("end", function (e) {
      
      parser.parseString(buffer, function (e, result) {
        lines = result["soap:Envelope"]["soap:Body"][0]["GetDepartureArrivalResponse"][0]["GetDepartureArrivalResult"][0]["Lines"][0]["Line"];
        station = result["soap:Envelope"]["soap:Body"][0]["GetDepartureArrivalResponse"][0]["GetDepartureArrivalResult"][0]["StopAreaData"][0]["Name"][0];

        for(var i = 0; i < lines.length; i++){
          if(lines[i].StopPoint[0] == "A"){
            bus_0.push(lines[i]);
          }else if(lines[i].StopPoint[0] == "B"){
            bus_1.push(lines[i]);
          }      
        }

        var date_0 = new Date(bus_0[0].JourneyDateTime);
        var date_1 = new Date(bus_1[0].JourneyDateTime);

        messages.push("  " + clc.underline(station));
        messages.push("  [-> " + bus_0[0].Towards + "]: " + date_0.getHours() + ":" + date_0.getMinutes());
        messages.push("  [-> " + bus_1[0].Towards + "]: " + date_1.getHours() + ":" + date_1.getMinutes());
        messages.push("");

      });

    });

  }).on("error", function(e) {
    console.log("Got error: " + e.message);
  });

  http.get("http://www.labs.skanetrafiken.se/v2.2/stationresults.asp?selPointFrKey=" + id1, function(res) {

    var buffer = "";
    var lines = [];
    var station = "";
    var bus_0 = [];
    var bus_1 = [];

    res.on("data", function (chunk) {
      buffer += chunk; 
    });
    
    res.on("end", function (e) {
      
      parser.parseString(buffer, function (e, result) {
        lines = result["soap:Envelope"]["soap:Body"][0]["GetDepartureArrivalResponse"][0]["GetDepartureArrivalResult"][0]["Lines"][0]["Line"];
        station = result["soap:Envelope"]["soap:Body"][0]["GetDepartureArrivalResponse"][0]["GetDepartureArrivalResult"][0]["StopAreaData"][0]["Name"][0];

        for(var i = 0; i < lines.length; i++){
          if(lines[i].StopPoint[0] == "A"){
            bus_0.push(lines[i]);
          }else if(lines[i].StopPoint[0] == "B"){
            bus_1.push(lines[i]);
          }      
        }

        var date_0 = new Date(bus_0[0].JourneyDateTime);
        var date_1 = new Date(bus_1[0].JourneyDateTime);

        messages.push("  " + clc.underline(station));
        messages.push("  [-> " + bus_0[0].Towards + "]: " + date_0.getHours() + ":" + date_0.getMinutes());
        messages.push("  [-> " + bus_1[0].Towards + "]: " + date_1.getHours() + ":" + date_1.getMinutes());
        messages.push("");

      });

    });

  }).on("error", function(e) {
    console.log("Got error: " + e.message);
  });

}

function getWeather(){

  http.get("http://opendata-download-metfcst.smhi.se/api/category/pmp1.5g/version/1/geopoint/lat/56.046467/lon/12.694512/data.json", function(res) {

    var days = [];
    var buffer = "";
    var msg_c = "";
    var msg_t = "";

    res.on("data", function (chunk) {
      buffer += chunk; 
    });
    
    res.on("end", function (e) {

      var today = new Date();
      var weather = JSON.parse(buffer);

      days = weather.timeseries;

      for(var i = 0; i < days.length; i++){

        var temp = new Date(days[i].validTime);

        if(today.getDay() == temp.getDay()){

          var hours = temp.getHours();

          if(hours == 0){
            hours = 24;
          }
          
          if(i == 0){
            msg_c += "  | " + hours + ":" + temp.getMinutes() + " | ";
            msg_t += "  | ";
          }else if(i == days.length -1){
            msg_c += hours + ":" + temp.getMinutes() + " |";
          }else{
            msg_c += hours + ":" + temp.getMinutes() + " | ";
          }
          
          if(days[i].t > 20){
            msg_t += clc.red(days[i].t.toFixed(1));
          } else if(days[i].t > 15){
            msg_t += clc.green(days[i].t.toFixed(1));
          } else if(days[i].t > 10){
            msg_t += clc.yellow(days[i].t.toFixed(1));
          } else if(days[i].t > 0){
            msg_t += clc.cyan(days[i].t.toFixed(1));
          } else if(days[i].t <= 0){
            msg_t += clc.blue(days[i].t.toFixed(1));
          }

          msg_t += " | ";

        }
      }

      messages.push(clc.bold("Väder"));
      messages.push("");
      messages.push(msg_c);
      messages.push(msg_t);
      messages.push("");

      printMessage();

    });

  }).on("error", function(e) {
    console.log("Got error: " + e.message);
  });
}

function printMessage(){

  for(var i = 0; i < messages.length; i++){
    console.log(messages[i]);
  }
  
}