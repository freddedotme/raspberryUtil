var http = require("http"),
    xml2js = require("xml2js"),
    clc = require('cli-color'),
    parser = new xml2js.Parser(),
    Q = require('q');

var interval = 15000, // 10 minutes (ITS UNDER DEV, RELAX FFS!!!)
    busID_0 = 83055,
    busID_1 = 83054,
    weatherCoords = [{
      lat: '56.046467',
      lon: '12.694512'
    }],
    currencyBases = ['USD'];

var messages = [];

function pull() {

// Reset messages
messages = [];

console.log('\033[2J');
getBuses([busID_0, busID_1]).then(function() {
  return getWeather(weatherCoords);
}).then(function() {
  return getCurrency(currencyBases);
}).catch(function() {
  console.log('An error occurred!');
}).done(function() {
  printMessages();
});
}

// Intitate

pull();

setInterval(pull, interval);

function getBuses(stopIDs){

  var deferred = Q.defer(),
  completedRequests = 0;

  messages.push(clc.bold("Busstider"));
  messages.push("");

  for (var stopCounter = 0; stopCounter < stopIDs.length; stopCounter++) {
    var id = stopIDs[stopCounter];

    http.get("http://www.labs.skanetrafiken.se/v2.2/stationresults.asp?selPointFrKey=" + id, function(res) {  

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

          completedRequests++;

          if (completedRequests == stopIDs.length) {
            deferred.resolve();
          };

        });

      });

    }).on("error", function(e) {
      console.log("Got error: " + e.message);
      deferred.reject();
    });

  };

  return deferred.promise;

}

function getWeather(latLonS){

  var deferred = Q.defer(),
  completedRequests = 0;

  for (var latLonCounter = 0; latLonCounter < latLonS.length; latLonCounter++) {
    var latLon = latLonS[latLonCounter];

    http.get("http://opendata-download-metfcst.smhi.se/api/category/pmp1.5g/version/1/geopoint/lat/" + latLon.lat + "/lon/" + latLon.lon + "/data.json", function(res) {

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

        completedRequests++;

        if (completedRequests == latLonS.length) {
          deferred.resolve();    
        };

      });

    }).on("error", function(e) {
      console.log("Got error: " + e.message);
      deferred.reject();
    });

  };

  return deferred.promise;

}

function getCurrency(bases) {

  var deferred = Q.defer(),
  completedRequests = 0;

  messages.push(clc.bold("Valuta"));
  messages.push("");

  for (var baseCounter = 0; baseCounter < bases.length; baseCounter++) {
    var base = bases[baseCounter];

    http.get("http://api.fixer.io/latest?base=" + base, function(res) {

      var buffer = "";

      res.on("data", function (chunk) {
        buffer += chunk; 
      });

      res.on("end", function (e) {

        var currency = JSON.parse(buffer);
        var rates = currency.rates;

        messages.push("  1 x " + base + " = " + rates.SEK + " SEK");
        messages.push("  1 x " + base + " = " + rates.GBP + " GBP");
        messages.push("");

        completedRequests++;

        if (completedRequests == bases.length) {
          deferred.resolve();
        };

      });

    }).on("error", function(e) {
      console.log("Got error: " + e.message);
      deferred.reject();
    });

  };

  return deferred.promise;

}

function printMessages(){

  for(var i = 0; i < messages.length; i++){
    console.log(messages[i]);
  }

}