// ---------------------------
// Credit to Albin, @alphahweu, for help
// Current API's: Skanetrafiken, SMHI, Fixer.io, api.dryg.net

// ---------------------------
// INIT / GLOBAL

  var http = require("http"),
      xml2js = require("xml2js"),
      clc = require('cli-color'),
      parser = new xml2js.Parser(),
      Q = require('q'),
      week = require("current-week-number");

  var interval = 300000, // 5 min fetch
      interval2 = 15000, // 15 sec display
      busID_0 = 83055,
      busID_1 = 83054,
      first = true,
      fetching = false,
      weatherCoords = [{
        lat: '56.046467',
        lon: '12.694512'
      }],
      currencyBases = ['USD'],
      t_next,
      t_curr,
      page = 0,
      today = new Date();

  var Data = []; // Stores all the stuffz

  var messages = {};

    messages.FETCHING = "Hämtar data ...";
    messages.DONE = "Klart!";
    messages.ERROR = "Ops! Något blev fel!"
    messages.CLEARSCREEN = "\033[2J"; // Tested on Debian
    messages.TAB = "\t\t";

// ---------------------------
// MAIN FUNCTIONS
// fetchData - fetches from all API's and stores it (5m)
// printData - prints all the data in a nice format (15s)

  function fetchData() {

    console.log(messages.FETCHING);
    fetching = true;

    // Reset data
    Data = [];

    getBuses([busID_0, busID_1]).then(function() {

      return getWeather(weatherCoords);

    }).then(function() { return getCurrency(currencyBases);
    }).then(function() { return getDayInfo(today);
    }).catch(function() { console.log(messages.ERROR);
    }).done(function() {

      t_curr = new Date();
      t_next = new Date(t_curr.getTime() + interval);

      console.log(messages.DONE);
      fetching = false;

      printData();

    });

  }

  function printData() {

    // Pre-caution
    setTimeout(function(){ 

      var T = new Date();
      today = new Date();

      var t_diffMs = (Math.abs(T-t_next) / 1000);
      var t_diffMins = Math.floor(t_diffMs / 60) % 60;
      var t_diffSecs = Math.floor(t_diffMs % 60);

      if(!first && !fetching){

        // Clears screen
        console.log(messages.CLEARSCREEN);

        // Header
        var seconds = "";
        var minutes = "";

        if(today.getSeconds() < 10){ seconds = "0" + today.getSeconds(); } else { seconds = today.getSeconds(); }
        if(today.getMinutes() < 10){ minutes = "0" + today.getMinutes(); } else { minutes = today.getMinutes(); }

        console.log(clc.bold("Tid: ") + clc.magenta(today.getHours()) + ":" + clc.magenta(minutes) + ":" + clc.magenta(seconds) + " | V: " + clc.magenta(week()) + messages.TAB + clc.bold("Väder: ") + clc.magenta(Data["WeatherData"]["today"][0]["t"]) + " °C | " + clc.magenta(Data["WeatherData"]["today"][0]["ws"]) + " m/s");
        console.log(clc.green("------------------------------------------------------------"));

        // Body
        if(page == 0){

          // Practical (transport etc.)
          if(Data["DayData"].free){ 
            console.log(" " + clc.bold(Data["DayData"]["day"]) + " - Röd dag");
          }else{
            console.log(" " + clc.bold(Data["DayData"]["day"]));
          }

          var namedays = "";

          for(var i = 0; i < Data["DayData"].namedays.length; i++){
            if(i == Data["DayData"].namedays.length - 1){
              namedays += Data["DayData"].namedays[i];
            }else{
              namedays += Data["DayData"].namedays[i] + ", ";
            }
          }

          console.log(" Namnsdag: " + namedays);

          console.log(" " + clc.yellow("-"));

          var weather_time = "";
          var weather_temp = "";

          for(var i = 0; i < Data["WeatherData"]["today"].length; i++){

            var weather_date = new Date(Data["WeatherData"]["today"][i].T);

            weather_time += weather_date.getUTCHours() + ":00 | ";
            weather_t = Data["WeatherData"]["today"][i].t.toFixed(1);

            if(weather_t > 20){ weather_t = clc.red(weather_t); }
            else if(weather_t > 15){ weather_t = clc.yellow(weather_t); }
            else if(weather_t > 10){ weather_t = clc.green(weather_t); }
            else if(weather_t > 0){ weather_t = clc.cyan(weather_t); }
            else if(weather_t <= 0){ weather_t = clc.white(weather_t); }

            if(Data["WeatherData"]["today"][i].rain){ weather_t = clc.blue(weather_t); }

            weather_temp += weather_t + "  | ";

            if(i == 6){ break; } // Too wide otherwise :/

          }

          console.log(" T: " + weather_time);
          console.log(" C: " + weather_temp);

          console.log(" " + clc.yellow("-"));

          console.log(" [" + Data["BusData0"]["from"] + " -> " + Data["BusData0"]["bus_0_station"]  + "]: " + clc.cyan(Data["BusData0"]["bus_0_t"]));
          console.log(" [" + Data["BusData0"]["from"] + " -> " + Data["BusData0"]["bus_1_station"]  + "]: " + clc.cyan(Data["BusData0"]["bus_1_t"]));
          console.log(" " + clc.yellow("-"));
          console.log(" [" + Data["BusData1"]["from"] + " -> " + Data["BusData1"]["bus_0_station"]  + "]: " + clc.cyan(Data["BusData1"]["bus_0_t"]));
          console.log(" [" + Data["BusData1"]["from"] + " -> " + Data["BusData1"]["bus_1_station"]  + "]: " + clc.cyan(Data["BusData1"]["bus_1_t"]));

        }else if(page == 1){

          // Social (trends etc.)
          console.log(" [Social content]");

        }else if(page == 2){

          // Stats (currency, population, pageview etc.)
          console.log(" [Stats content]");

        }
        

        // Footer
        console.log(clc.green("------------------------------------------------------------"));

        var paginator = "\t\t\t\t\t " + (page+1) + "/3";

        if(t_diffSecs == 0){ console.log("[Uppdatering -> " + t_diffMins + ":00]" + paginator); }
        else if(t_diffSecs < 10){ console.log("[Uppdatering -> " + t_diffMins + ":0" + t_diffSecs + "]" + paginator); }
        else{ console.log("[Uppdatering -> " + t_diffMins + ":" + t_diffSecs + "]" + paginator); }

        if(page < 2){ page++; }else{ page = 0; }

      }

      // Hackish, sorry.
      if(first){ first = false; }

    }, 2000);

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
            Bus.from = station;
            Bus.bus_0_line = bus_0;
            Bus.bus_1_line = bus_1;
            Bus.bus_0_station = bus_0[0].Towards[0];
            Bus.bus_1_station = "Helsingborg C";

            var minutes0 = "";
            var minutes1 = "";

            if(date_0.getUTCMinutes() < 10){ minutes0 = "0" + date_0.getUTCMinutes(); } else { minutes0 = date_0.getUTCMinutes(); }
            if(date_1.getUTCMinutes() < 10){ minutes1 = "0" + date_1.getUTCMinutes(); } else { minutes1 = date_1.getUTCMinutes(); }

            Bus.bus_0_t = date_0.getUTCHours() + ":" + minutes0;
            Bus.bus_1_t = date_1.getUTCHours() + ":" + minutes1;

            // Finally store it!
            Data["BusData" + completedRequests] = Bus;

            Bus = {};

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
            var rain = false;

            if(days[i].pit > 0){ rain = true; }

            if(today.getDay() == x.getDay() && today.getHours() <= x.getUTCHours()){
              current.push({t:days[i].t, T:days[i].validTime, pit:days[i].pit, ws:days[i].ws, rain:rain});
            }

            list.push({t:days[i].t, T:days[i].validTime, pit:days[i].pit, ws:days[i].ws, rain:rain});

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

  function getDayInfo(d){

    var Day = {};

    var deferred = Q.defer(),
    completedRequests = 0;

    var month = "";
    var date = "";

    if((d.getMonth() + 1) < 10){ month = "0" + (d.getMonth() + 1); }else{ month = (d.getMonth() + 1); }
    if(d.getDate() < 10){ date = "0" + d.getDate(); }else{ date = d.getDate(); }

    http.get("http://api.dryg.net/dagar/v2.1/" + d.getFullYear() + "/" + month + "/" + date, function(res) {

      var buffer = "";

      res.on("data", function (chunk) {
        buffer += chunk; 
      });

      res.on("end", function (e) {

        var day = JSON.parse(buffer);

        // Put all our data at one place
        if(day.dagar[0]["arbetsfri dag"] == "Ja"){ Day.free = true; }else{ Day.free = false; }
        if(day.dagar[0]["röd dag"] == "Ja"){ Day.red = true; }else{ Day.red = false; }
        Day.namedays = day.dagar[0].namnsdag;
        Day.day = day.dagar[0].veckodag;

        // Finally store it!
        Data["DayData"] = Day;

        deferred.resolve();

      });

    }).on("error", function(e) {
      console.log("Got error: " + e.message);
      deferred.reject();
    });

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