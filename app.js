var http = require("http"),
    xml2js = require("xml2js"),
    clc = require('cli-color'),
    parser = new xml2js.Parser(),
    Q = require('q'),
    week = require("current-week-number");

var interval = 600000, // 10 minutes (ITS UNDER DEV!!!)
    busID_0 = 83055,
    busID_1 = 83054,
    weatherCoords = [{
      lat: '56.046467',
      lon: '12.694512'
    }],
    currencyBases = ['USD'],
    loader = false,
    today = new Date();

var messages = [];

function pull() {

// Reset messages
messages = [];

getBuses([busID_0, busID_1]).then(function() {
  console.log("Laddar busstider!");
  return getWeather(weatherCoords);
}).then(function() {
  console.log("Laddar väder!");
  return getCurrency(currencyBases);
}).catch(function() {
  console.log('An error occurred!');
}).done(function() {
  console.log("Laddar valuta!");
  console.log('\033[2J');
  console.log(clc.bold("Tid: ") + today.getHours() + ":" + today.getMinutes() + " / Vecka: " + week());
  console.log("");
  printMessages();
});
}

// Intitate

pull();

setInterval(pull, interval);

function getBuses(stopIDs){

  var deferred = Q.defer(),
  completedRequests = 0;

  messages.push(clc.bold("Busstider \t Väder"));
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
      var msg_r = "";

      res.on("data", function (chunk) {
        buffer += chunk; 
      });

      res.on("end", function (e) {

        var weather = JSON.parse(buffer);
        var x = 0;

        days = weather.timeseries;

        for(var i = 0; i < days.length; i++){

          var temp = new Date(days[i].validTime);

          if(today.getDay() == temp.getDay()){

              var hours = temp.getHours();

              if(hours == 0 || hours == 2){
                hours = 24;
              }

              if(today.getHours() <= hours){             

                if(x == 0){
                  msg_c += "  | " + clc.underline(hours) + ":" + clc.underline(temp.getMinutes()) + " | ";
                  msg_t += "  | ";
                  msg_r += "  | ";
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

                msg_r += days[i].pit.toFixed(2);

                msg_t += " | ";
                msg_r += " | ";

                x++;

              }

            }

        }

        //messages.push(clc.bold("Väder"));
        //messages.push("");
        //messages.push(msg_c);
        //messages.push(msg_t);
        //messages.push(msg_r);
        //messages.push("");

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

  //messages.push(clc.bold("Valuta"));
  //messages.push("");

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

        //messages.push("  1 x " + base + " = " + rates.SEK + " SEK");
        //messages.push("  1 x " + base + " = " + rates.GBP + " GBP");
        //messages.push("");

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

function viewSpinner(state){

  loader = state;

  if(loader){

    for(var i = 0; i < 2; i++){

      console.log("loading");

      if(i == 1){
        i = 0;
      }

    }

  }

}

function printMessages(){

  for(var i = 0; i < messages.length; i++){
    console.log(messages[i]);
  }

}