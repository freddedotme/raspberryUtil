// ---------------------------
// Credit to Albin, @alphahweu, for help
// Current API's: Skanetrafiken, SMHI, Fixer.io

// ---------------------------
// INIT / GLOBAL

  var http = require("http"),
      xml2js = require("xml2js"),
      clc = require('cli-color'),
      parser = new xml2js.Parser(),
      Q = require('q'),
      week = require("current-week-number");

  var interval = 600000, // 10 min fetch
      interval2 = 20000, // 20 sec display
      busID_0 = 83055,
      busID_1 = 83054,
      first = true,
      weatherCoords = [{
        lat: '56.046467',
        lon: '12.694512'
      }],
      currencyBases = ['USD'],
      t_next,
      t_curr,
      today = new Date();

  var Data = []; // Stores all the stuffz

  var messages = {};

    messages.FETCHING = "Hämtar data ...";
    messages.DONE = "Klart!";
    messages.ERROR = "Ops! Något blev fel!"
    messages.CLEARSCREEN = "\033[2J"; // Tested on Debian
    messages.TIMESTAMP = clc.bold("Tid: ") + today.getHours() + ":" + today.getMinutes() + " | V: " + week();
    messages.TAB = "\t\t";

// ---------------------------
// MAIN FUNCTIONS
// fetchData - fetches from all API's and stores it (10m)
// printData - prints all the data in a nice format (20s)

  function fetchData() {

    // Reset data
    Data = [];

    getBuses([busID_0, busID_1]).then(function() {

      console.log(messages.FETCHING);
      return getWeather(weatherCoords);

    }).then(function() { return getCurrency(currencyBases);
    }).catch(function() { console.log(messages.ERROR);
    }).done(function() {

      t_curr = new Date();
      t_next = new Date(t_curr.getTime() + interval);

      console.log(messages.DONE);
      printData();

    });

  }

  function printData() {

    var T = new Date();

    var t_diffMs = (Math.abs(T-t_next) / 1000);
    var t_diffMins = Math.floor(t_diffMs / 60) % 60;
    var t_diffSecs = Math.floor(t_diffMs % 60);

    if(!first){

      // Clears screen
      console.log(messages.CLEARSCREEN);

      // Header
      console.log(messages.TIMESTAMP + messages.TAB + clc.bold("Väder: ") + clc.magenta(Data["WeatherData"]["today"][0]["t"]) + " °C | " + clc.magenta(Data["WeatherData"]["today"][0]["ws"]) + " m/s");
      console.log(clc.green("------------------------------------------------------------"));
      console.log("");

      // Bottom
      console.log(clc.green("---------------------------"));
      if(t_diffSecs == 0){ console.log("[Uppdatering -> " + t_diffMins + ":00]"); }
      else if(t_diffSecs < 10){ console.log("[Uppdatering -> " + t_diffMins + ":0" + t_diffSecs + "]"); }
      else{ console.log("[Uppdatering -> " + t_diffMins + ":" + t_diffSecs + "]"); }

    }

    // Hackish, sorry.
    if(first){ first = false; }

  }

// ---------------------------
// INIT RUN

  fetchData();
  setInterval(fetchData, interval);

  printData();
  setInterval(printData, interval2);

// ---------------------------
// FUNCTIONS
// Still needs some cleaning, everything above is up to date ^

  function getBuses(stopIDs){

    var Bus = {};

    var deferred = Q.defer(),
    completedRequests = 0;

    for (var stopCounter = 0; stopCounter < stopIDs.length; stopCounter++) {
      var id = stopIDs[stopCounter];

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

            // Put all our data at one place
            Bus.bus_0_line = bus_0;
            Bus.bus_1_line = bus_1;
            Bus.bus_0_station = bus_0[0].Towards[0];
            Bus.bus_1_station = bus_1[0].Towards[0];
            Bus.bus_0_msg = "[-> " + bus_0[0].Towards + "]: " + date_0.getUTCHours() + ":" + date_0.getUTCMinutes();
            Bus.bus_1_msg = "[-> " + bus_1[0].Towards + "]: " + date_1.getUTCHours() + ":" + date_1.getUTCMinutes();

            // Finally store it!
            Data["BusData"] = Bus;

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

    var Weather = {};

    var deferred = Q.defer(),
    completedRequests = 0;

    for (var latLonCounter = 0; latLonCounter < latLonS.length; latLonCounter++) {
      var latLon = latLonS[latLonCounter];

      http.get("http://opendata-download-metfcst.smhi.se/api/category/pmp1.5g/version/1/geopoint/lat/" + latLon.lat + "/lon/" + latLon.lon + "/data.json", function(res) {

        var days = [];
        var list = [];
        var current = [];
        var buffer = "";

        res.on("data", function (chunk) {
          buffer += chunk; 
        });

        res.on("end", function (e) {

          var weather = JSON.parse(buffer);
          var days = weather.timeseries

          for(var i = 0; i < days.length; i++){       

            var x = new Date(days[i].validTime);

            if(today.getDay() == x.getDay() && today.getHours() <= x.getUTCHours()){
              current.push({t:days[i].t, T:days[i].validTime, pit:days[i].pit, ws:days[i].ws});
            }

            list.push({t:days[i].t, T:days[i].validTime, pit:days[i].pit, ws:days[i].ws});

          }

          // Put all our data at one place
          Weather.list = list;
          Weather.today = current;

          // Finally store it!
          Data["WeatherData"] = Weather;

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