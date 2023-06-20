// Replace with your Firebase project's configuration
var firebaseConfig = {
  apiKey: "AIzaSyCvh_Wg62d3eBKcTC2H1mmti_WGAA_eRC0",
  authDomain: "the-flood-alert-ph.firebaseapp.com",
  databaseURL: "https://the-flood-alert-ph-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "the-flood-alert-ph",
  storageBucket: "the-flood-alert-ph.appspot.com",
  messagingSenderId: "897766334759",
  appId: "1:897766334759:web:cae9fa2fe4561221744902"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Reference the database
var database = firebase.database();

// convert epochtime to JavaScripte Date object
function epochToJsDate(epochTime) {
  return new Date(epochTime * 1000);
}

// convert time to human-readable format YYYY/MM/DD HH:MM:SS
function epochToDateTime(epochTime) {
  var epochDate = new Date(epochToJsDate(epochTime));
  var dateTime = epochDate.getFullYear() + "/" +
    ("00" + (epochDate.getMonth() + 1)).slice(-2) + "/" +
    ("00" + epochDate.getDate()).slice(-2) + " " +
    ("00" + epochDate.getHours()).slice(-2) + ":" +
    ("00" + epochDate.getMinutes()).slice(-2) + ":" +
    ("00" + epochDate.getSeconds()).slice(-2);

  return dateTime;
}

function fetchWeatherData() {
  // Replace 'YOUR_API_KEY' with your actual OpenWeather API key
  const apiKey = '8e041dd412b0ca998f65c56269695ef9';
  // Replace 'CITY_NAME' with the name of the city you want weather information for
  const city = 'Imus City';

  // Create the API URL
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;

  // Make the API request
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Extract the weather condition from the API response
      // console.log();
      const weatherIconCode = data.weather[0].icon;

      // Create the HTML element for the weather icon
      const weatherIconElement = document.createElement('img');
      weatherIconElement.src = `https://openweathermap.org/img/wn/${weatherIconCode}.png`;
      weatherIconElement.alt = 'Weather Icon';
      const weatherCondition = data.weather[0].description;
      const precipitationRate = data.rain && data.rain['1h'] ? data.rain['1h'] : 0;

      // Update the HTML element with the weather information
      const weatherInfoElement = document.getElementById('weather-info');
      weatherInfoElement.innerText = weatherCondition;
      const rainInfoElement = document.getElementById('rain-info');
      rainInfoElement.innerText = `Precipitation: ${precipitationRate} mm/h`;
      const weathericonInfoElement = document.getElementById('weather-icon-info');
      weathericonInfoElement.appendChild(weatherIconElement);
    })
    .catch(error => {
      // console.error('Error:', error);
    });
}

// Call the function to fetch weather data
fetchWeatherData();

function updateTime() {
  var date = new Date();
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  var dateTimeString = date.toLocaleDateString(undefined, options) + " " + date.toLocaleTimeString();
  document.getElementById("timeSpan").innerText = dateTimeString;
}


// Update the time every second
setInterval(updateTime, 1000);

var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});

// Reference the specific location in your database
var uid = 'TPxW3qcPKldbeuZkSYjGJv08PBj2';
var dbPath = 'SensorData/' + uid.toString() + '/readings';
var dbfloodRiskPath = 'SensorData/' + uid.toString() + '/FloodRiskData';
var mapDataRef = database.ref(dbPath);
var obj1DataRef = database.ref(dbPath);
var obj2DataRef = database.ref(dbPath);
var obj3DataRef = database.ref(dbPath);
// var charts = {};
var maxPressureObj1 = 0;
var maxPressureObj2 = 0;
var maxPressureObj3 = 0;
var floodRiskDataRef = database.ref(dbfloodRiskPath).orderByKey().limitToLast(1);
var boardDataRef = database.ref(dbPath).orderByKey();
var sensorDataRef1 = database.ref(dbPath).orderByKey();
var floodRiskDataRef1 = database.ref(dbfloodRiskPath).orderByKey();
var twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
var oneHourAgo = Date.now() - 1 * 60 * 60 * 1000;
var lastWaterLevel = null;

var historyChart; // Reference to the Highcharts chart


function fetchHistoryData(boardId) {
  var dbPath = 'SensorData/' + uid.toString() + '/readings';
  var boardDataRef = database.ref(dbPath);

  return new Promise((resolve, reject) => {
    // Retrieve the latest 50 readings for the specified board
    boardDataRef.orderByChild("boardId").equalTo(boardId + ".00").limitToLast(50).once('value', function (snapshot) {
      var readings = snapshot.val();
      var data = [];

      // Assuming readings is an object where keys are timestamps and values are water level pressures
      for (var key in readings) {
        var reading = readings[key];
        var timestamp = Number(reading.timestamp); // Ensure timestamp is a number
        var waterlevelpressure = parseFloat(reading.waterlevelpressure); // Ensure pressure is a number

        if (!isNaN(timestamp) && !isNaN(waterlevelpressure)) {
          data.push([timestamp * 1000, waterlevelpressure]); // Multiply timestamp by 1000 if it's in seconds
        }
      }

      // Sort data by timestamp
      data.sort((a, b) => a[0] - b[0]);

      resolve(data);
    });
  });
}

// Function to fetch flood risk data
function fetchFloodRiskData() {
  var dbFloodRiskPath = 'SensorData/' + uid.toString() + '/FloodRiskData';
  var floodRiskDataRef = database.ref(dbFloodRiskPath).orderByKey().limitToLast(50);

  return new Promise((resolve, reject) => {
    floodRiskDataRef.once('value', function (snapshot) {
      var floodRiskData = snapshot.val();
      var data = [];

      // Loop through and store flood risk data
      for (var key in floodRiskData) {
        var floodRisk = floodRiskData[key];
        var timestamp = Number(floodRisk.timestamp);
        var floodRiskValue = parseFloat(floodRisk.floodriskvalue);

        if (!isNaN(timestamp) && !isNaN(floodRiskValue)) {
          data.push([timestamp * 1000, floodRiskValue]);
        }
      }

      // Sort data by timestamp
      data.sort((a, b) => a[0] - b[0]);

      resolve(data);
    });
  });
}

// Function to create a Highcharts chart
async function createHistoricalChart() {
  // Fetch data from boards 1, 2, 3 and flood risk data
  var dataBoard1 = await fetchHistoryData(1);
  var dataBoard2 = await fetchHistoryData(2);
  var dataBoard3 = await fetchHistoryData(3);
  var dataFloodRisk = await fetchFloodRiskData();

  // Create Highcharts chart
  historyChart = Highcharts.chart('container1', {
    chart: {
      type: 'line'
    },
    title: {
      text: 'Water Level Pressure Changes and Flood Risk'
    },
    xAxis: {
      type: 'datetime',
      title: {
        text: 'Timestamp'
      }
    },
    yAxis: {
      title: {
        text: 'Values'
      }
    },
    series: [
      {
        name: 'Tribunary River - Water Level Pressure',
        data: dataBoard1
      },
      {
        name: 'E. Villanueva St. - Water Level Pressure',
        data: dataBoard2
      },
      {
        name: 'Toclong II St. - Water Level Pressure',
        data: dataBoard3
      },
      {
        name: 'Flood Risk',
        data: dataFloodRisk
      }
    ]
  });
}

// Call the function to create the chart
createHistoricalChart();
window.onload = function() {
  // Create the initial chart
  createHistoricalChart();
  // Add event listeners to toggle the visibility of series
  document.getElementById("toggleBoard1").addEventListener("change", function(e) {
    historyChart.series[0].setVisible(e.target.checked, false);
    historyChart.redraw();
  });
  document.getElementById("toggleBoard2").addEventListener("change", function(e) {
    historyChart.series[1].setVisible(e.target.checked, false);
    historyChart.redraw();
  });
  document.getElementById("toggleBoard3").addEventListener("change", function(e) {
    historyChart.series[2].setVisible(e.target.checked, false);
    historyChart.redraw();
  });
  document.getElementById("toggleFloodRisk").addEventListener("change", function(e) {
    historyChart.series[3].setVisible(e.target.checked, false);
    historyChart.redraw();
  });
};

function setTimeRange(hours) {
  var milliseconds = hours * 3600 * 1000;
  var maxTime = (new Date()).getTime();
  var minTime = maxTime - milliseconds;
  historyChart.xAxis[0].setExtremes(minTime, maxTime);
}
function setLast50Readings() {
var allDataPoints = [];

// Gather all data points from all series
historyChart.series.forEach(function (series) {
    allDataPoints = allDataPoints.concat(series.data);
});

// Sort all data points by x (timestamp) in descending order
allDataPoints.sort(function (a, b) {
    return b.x - a.x;
});

// Get the timestamp of the 50th last reading, if available
var minTime = allDataPoints.length >= 50 ? allDataPoints[49].x : allDataPoints[allDataPoints.length - 1].x;
var maxTime = allDataPoints[0].x;

// Update the x-axis range
historyChart.xAxis[0].setExtremes(minTime, maxTime);
}

floodRiskDataRef.on('child_added', function (snapshot) {
  var obj = snapshot.toJSON();
  var objtime = obj.timestamp;
  var objfr = Number(obj.floodriskvalue);
  console.log("objtime :", objtime);
  console.log("objfr :", objfr);
  // Create the chart
  if ((objtime * 1000) >= oneHourAgo) {
    objfr = objfr;
  } else {
    objfr = 0;
  }
  Highcharts.chart('flood-risk-bar', {
    chart: {
      type: "gauge",
      height: 250
    },
    title: {
      text: "Flood Risk (Today)"
    },
    pane: {
      size: "100%",
      startAngle: -90,
      endAngle: 90,
      background: [
        {

          backgroundColor: "white",
          innerRadius: "0%",
          outerRadius: "0%",
          borderWidth: 0
        }
      ]
    },
    tooltip: {
      enabled: false
    },
    credits: {
      enabled: false
    },
    plotOptions: {
      gauge: {
        dataLabels: {
          enabled: false
        },
        dial: {
          baseLength: "0%",
          baseWidth: 5,
          radius: "90%",
          rearLength: "0%",
          topWidth: 1
        }
      }
    },
    yAxis: {
      lineWidth: 0,
      tickWidth: 0,
      tickPositions: [],
      minorTickInterval: null,
      min: 0,
      max: 100,
      plotBands: [
        {
          from: 67,
          to: 100,
          color: "red",
          thickness: "40%"

        },
        {
          from: 33,
          to: 66,
          color: "orange",
          thickness: "40%"
        },
        {
          from: 0,
          to: 32,
          color: "green",
          thickness: "40%"
        }
      ]
    },
    series: [
      {
        data: [objfr]
      }
    ]
  });
  updateProgressBar(objfr, objtime);
}, false);
floodRiskDataRef1.limitToLast(5).on('child_added', function (snapshot) {
  var recentFloodDataDiv = document.getElementById('recent-data-flood');
  var obj = snapshot.val();
  var objfr = Number(obj.floodriskvalue);
  var objtime = obj.timestamp;

  // Create the card and card-body elements
  var card = document.createElement('div');
  card.className = 'card';

  var cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  // Create a <p> element to display the field data
  // Create a <div> element to contain the field data
  var fieldData = document.createElement('div');

  // Create a <span> element for each data field
  var objfrSpan = createBadgeSpan("FloodRiskValue: " + objfr);
  var objtimeSpan = createBadgeSpan("Time: " + epochToDateTime(objtime));

  // Function to create a <span> element with Bootstrap badge
  function createBadgeSpan(text) {
    var span = document.createElement('span');
    span.className = 'badge bg-success me-1';
    span.textContent = text;
    return span;
  }

  fieldData.appendChild(objfrSpan);
  fieldData.appendChild(objtimeSpan);
  // Append the field data to the card-body

  cardBody.appendChild(fieldData);
  // Append the card-body to the card
  card.appendChild(cardBody);

  // Append the card to the recent data div
  recentFloodDataDiv.prepend(card);
  recentFloodDataDiv.style.maxHeight = '200px'; // Adjust the desired height here
  recentFloodDataDiv.style.overflowY = 'auto';
});
function objDataChanges(id) {
  var dbPath = 'SensorData/' + uid.toString() + '/readings';
  var objDataDataRef = database.ref(dbPath);
  objDataDataRef.orderByChild("boardId").equalTo(id + ".00").limitToLast(1).on('child_added', function (snapshot) {
    var obj = snapshot.toJSON();
    console.log("objId: ", obj.boardId)
    var objFloatId = obj.boardId;
    var objtime = obj.timestamp;
    var objid = parseInt(objFloatId);
    var objtemp = Number(obj.temperature);
    var objhum = Number(obj.humidity);
    var objpres = Number(obj.waterlevelpressure);
    var objbat = Number(obj.battery);
    console.log("24hrsAgo", (objtime * 1000) >= twentyFourHoursAgo);
    // if (objid == 1) {
    //   var h2Element1 = document.getElementById("h2_1");
    //   if (objpres > maxPressureObj1 && (objtime * 1000) >= twentyFourHoursAgo) {
    //     maxPressureObj1 = objpres;
    //   } else if (objtime < twentyFourHoursAgo) {
    //     maxPressureObj1 = 0;
    //   }
    //   h2Element1.innerHTML = "Tributary River: " + maxPressureObj1 + "cm";
    // } else if (objid == 2) {
    //   var h2Element2 = document.getElementById("h2_2");
    //   if (objpres > maxPressureObj2 && (objtime * 1000) >= twentyFourHoursAgo) {
    //     maxPressureObj2 = objpres;
    //   } else if (objtime < twentyFourHoursAgo) {
    //     maxPressureObj2 = 0;
    //   }
    //   h2Element2.innerHTML = "E. Villanueva St.: " + maxPressureObj2 + "cm";
    // } else if (objid == 3) {
    //   var h2Element3 = document.getElementById("h2_3");
    //   if (objpres > maxPressureObj3 && (objtime * 1000) >= twentyFourHoursAgo) {
    //     maxPressureObj3 = objpres;
    //   } else if (objtime < twentyFourHoursAgo) {
    //     maxPressureObj3 = 0;
    //   }
    //   h2Element3.innerHTML = "Toclong II St.: " + maxPressureObj3 + "cm";
    // }
    var waterLevel = objpres;

    if (waterLevel >= 10 && waterLevel <= 20 && (objtime * 1000) >= twentyFourHoursAgo) {
      moveColumn(objid, "nplv-street");
    } else if (waterLevel > 20 && waterLevel <= 150 && (objtime * 1000) >= twentyFourHoursAgo) {
      moveColumn(objid, "npatv-street");
    } else {
      moveColumn(objid, "patv-street");
    }

    // Calculate time ago
    var currentTime = new Date();
    var objDateTime = new Date(objtime * 1000);
    var timeDiff = currentTime - objDateTime;
    var secondsDiff = Math.floor(timeDiff / 1000);
    var days = Math.floor(secondsDiff / (24 * 60 * 60));
    var hours = Math.floor((secondsDiff % (24 * 60 * 60)) / (60 * 60));
    var minutes = Math.floor((secondsDiff % (60 * 60)) / 60);
    var seconds = secondsDiff % 60;
    var timeAgo = "";

    if (days > 0) {
      timeAgo = days + " days ago";
    } else if (hours > 0) {
      timeAgo = hours + " hours ago";
    } else if (minutes > 0) {
      timeAgo = minutes + " minutes ago";
    } else {
      timeAgo = seconds + " seconds ago";
    }
    document.getElementById("time-ago-" + objid).innerHTML = timeAgo;
    Highcharts.chart('pres' + objid, {
      chart: {
        type: 'solidgauge',
        height: 250
      },
      title: {
        text: 'Water Level',
        style: {
          fontSize: '22px'
        },
        verticalAlign: 'top',
        y: 40
      },
      pane: {
        startAngle: 0,
        endAngle: 340,
        background: {
          backgroundColor: '#EEE',
          innerRadius: '60%',
          outerRadius: '100%',
          shape: 'arc'
        }
      },
      yAxis: {
        min: 0,
        max: 90,
        lineWidth: 0,
        tickPositions: []
      },
      plotOptions: {
        solidgauge: {
          dataLabels: {
            enabled: true, // Set to true to display data labels
            y: -20, // Adjust the vertical position of the labels
            borderWidth: 0,
            useHTML: true
          },
          linecap: 'round',
          stickyTracking: false,
          rounded: true
        }
      },
      series: [{
        data: [{
          color: {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, 'white'],
              [1, 'red']
            ]
          },
          radius: '100%',
          innerRadius: '60%',
          y: objpres, // Initial value, change dynamically with water pressure
          dataLabels: {
            format: '<div style="text-align:center"><span style="font-size:25px;color:black">{y}</span><br/><span style="font-size:12px;color:silver">cm</span></div>'
          }
        }]
      }]
    });

    Highcharts.chart('temp' + objid, {
      chart: {
        type: 'solidgauge',
        height: 250
      },
      title: {
        text: 'Temperature',
        style: {
          fontSize: '22px'
        },
        verticalAlign: 'top',
        y: 40
      },
      pane: {
        startAngle: 0,
        endAngle: 340,
        background: {
          backgroundColor: '#EEE',
          innerRadius: '60%',
          outerRadius: '100%',
          shape: 'arc'
        }
      },
      yAxis: {
        min: 25,
        max: 40,
        lineWidth: 0,
        tickPositions: []
      },
      plotOptions: {
        solidgauge: {
          dataLabels: {
            enabled: true, // Set to true to display data labels
            y: -20, // Adjust the vertical position of the labels
            borderWidth: 0,
            useHTML: true
          },
          linecap: 'round',
          stickyTracking: false,
          rounded: true
        }
      },
      series: [{
        data: [{
          color: {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, 'white'],
              [1, 'blue']
            ]
          },
          radius: '100%',
          innerRadius: '60%',
          y: objtemp, // Initial value, change dynamically with water pressure
          dataLabels: {
            format: '<div style="text-align:center"><span style="font-size:25px;color:black">{y}</span><br/><span style="font-size:12px;color:silver">C</span></div>'
          }
        }]
      }]
    });
    Highcharts.chart('hum' + objid, {
      chart: {
        type: 'solidgauge',
        height: 250
      },
      title: {
        text: 'Humidity',
        style: {
          fontSize: '22px'
        },
        verticalAlign: 'top',
        y: 40
      },
      pane: {
        startAngle: 0,
        endAngle: 340,
        background: {
          backgroundColor: '#EEE',
          innerRadius: '60%',
          outerRadius: '100%',
          shape: 'arc'
        }
      },
      yAxis: {
        min: 40,
        max: 100,
        lineWidth: 0,
        tickPositions: []
      },
      plotOptions: {
        solidgauge: {
          dataLabels: {
            enabled: true, // Set to true to display data labels
            y: -20, // Adjust the vertical position of the labels
            borderWidth: 0,
            useHTML: true
          },
          linecap: 'round',
          stickyTracking: false,
          rounded: true
        }
      },
      series: [{
        data: [{
          color: {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, 'white'],
              [1, 'lightblue']
            ]
          },
          radius: '100%',
          innerRadius: '60%',
          y: objhum, // Initial value, change dynamically with water pressure
          dataLabels: {
            format: '<div style="text-align:center"><span style="font-size:25px;color:black">{y}</span><br/><span style="font-size:12px;color:silver">%</span></div>'
          }
        }]
      }]
    });
    Highcharts.chart('bat' + objid, {
      chart: {
        type: 'solidgauge',
        height: 250
      },
      title: {
        text: 'Battery Level',
        style: {
          fontSize: '22px'
        },
        verticalAlign: 'top',
        y: 40
      },
      pane: {
        startAngle: 0,
        endAngle: 340,
        background: {
          backgroundColor: '#EEE',
          innerRadius: '60%',
          outerRadius: '100%',
          shape: 'arc'
        }
      },
      yAxis: {
        min: 0,
        max: 100,
        lineWidth: 0,
        tickPositions: []
      },
      plotOptions: {
        solidgauge: {
          dataLabels: {
            enabled: true, // Set to true to display data labels
            y: -20, // Adjust the vertical position of the labels
            borderWidth: 0,
            useHTML: true
          },
          linecap: 'round',
          stickyTracking: false,
          rounded: true
        }
      },
      series: [{
        data: [{
          color: {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, 'white'],
              [1, 'lightgreen']
            ]
          },
          radius: '100%',
          innerRadius: '60%',
          y: objbat, // Initial value, change dynamically with water pressure
          dataLabels: {
            format: '<div style="text-align:center"><span style="font-size:25px;color:black">{y}</span><br/><span style="font-size:12px;color:silver">%</span></div>'
          }
        }]
      }]
    });
  });
}
objDataChanges("1");
objDataChanges("2");
objDataChanges("3");
sensorDataRef1.limitToLast(5).on('child_added', function (snapshot) {
  var recentDataDiv = document.getElementById('recent-data');
  var obj = snapshot.val();
  var objFloatId = obj.boardId;
  var objid = parseInt(objFloatId);
  var objbattery = obj.battery;
  var objhum = obj.humidity;
  var objreadingid = obj.readingId;
  var objtemp = obj.temperature;
  var objtime = obj.timestamp;
  var objlvl = obj.waterlevel;
  var objpres = obj.waterlevelpressure;

  // Create the card and card-body elements

  // Format the ID value with specific text based on cases
  var idText;
  switch (objid) {
    case 1:
      idText = "Tribunary River";
      break;
    case 2:
      idText = "E. Villanueva Ave.";
      break;
    case 3:
      idText = "Toclong II St.";
      break;
    default:
      idText = "Unknown";
  }

  // Create the card and card-body elements
  var card = document.createElement('div');
  card.className = 'card';

  var cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  // Create a <p> element to display the field data
  // Create a <div> element to contain the field data
  var fieldData = document.createElement('div');

  // Create a <p> element for the ID
  var idTextParagraph = document.createElement('p');
  idTextParagraph.textContent = idText;

  // Create an <hr> element to separate the ID
  var hr = document.createElement('hr');

  // Create a <span> element for each data field
  var batterySpan = createBadgeSpan("Battery: " + objbattery);
  var humiditySpan = createBadgeSpan("Humidity: " + objhum);
  var temperatureSpan = createBadgeSpan("Temperature: " + objtemp);
  var waterLevelSpan = createBadgeSpan("Ultrasonic: " + objlvl);
  var pressureSpan = createBadgeSpan("Water Level: " + objpres);

  // Function to create a <span> element with Bootstrap badge
  function createBadgeSpan(text) {
    var span = document.createElement('span');
    span.className = 'badge bg-success me-1 ';
    span.textContent = text;
    return span;
  }

  // Append the ID, horizontal line, and data spans to the field data container
  fieldData.appendChild(idTextParagraph);
  fieldData.appendChild(hr);
  fieldData.appendChild(batterySpan);
  fieldData.appendChild(humiditySpan);
  fieldData.appendChild(temperatureSpan);
  fieldData.appendChild(waterLevelSpan);
  fieldData.appendChild(pressureSpan);
  // Add CSS styling to limit height and enable scrolling

  var fieldData1 = document.createElement('p');
  fieldData1.textContent = "Time: " + epochToDateTime(objtime);
  // Append the field data to the card-body

  cardBody.appendChild(fieldData);
  cardBody.appendChild(fieldData1);
  // Append the card-body to the card
  card.appendChild(cardBody);

  // Append the card to the recent data div
  recentDataDiv.prepend(card);
  recentDataDiv.style.maxHeight = '300px'; // Adjust the desired height here
  recentDataDiv.style.overflowY = 'auto';
});
function updateProgressBar(frValue, timeValue) {
  // Update the chart series data

  var chart = Highcharts.charts[0]; // Get the reference to the chart
  if (chart && (timeValue * 1000) >= oneHourAgo) {
    var series = chart.series[0]; // Get the reference to the series
    series.update({
      data: [frValue]
    }, true);
  }
  console.log("floodriskvalue :", frValue);
  if (frValue >= 33 && frValue <= 66 && (timeValue * 1000) >= oneHourAgo) {
    var floodRiskValueRef = document.getElementById("flood-risk-value");
    floodRiskValueRef.innerHTML = "Warning";
  } else if (frValue > 67 && frValue <= 100 && (timeValue * 1000) >= oneHourAgo) {
    var floodRiskValueRef = document.getElementById("flood-risk-value");
    floodRiskValueRef.innerHTML = "Danger";

  } else if (frValue > -1 && frValue <= 32 && (timeValue * 1000) >= oneHourAgo) {
    var floodRiskValueRef = document.getElementById("flood-risk-value");
    floodRiskValueRef.innerHTML = "Safe";
  } else {
    var floodRiskValueRef = document.getElementById("flood-risk-value");
    floodRiskValueRef.innerHTML = "Not updated/Unknown";
  }

}
function moveColumn(id, targetColumn) {
  var column = document.getElementById(targetColumn);
  var name = getNameById(id);
  var idText = "<p>" + name + "</p>";

  if (!column.innerHTML.includes(idText)) {
    column.innerHTML += idText;
  }

  var otherColumns = ["patv-street", "nplv-street", "npatv-street"];
  for (var i = 0; i < otherColumns.length; i++) {
    if (otherColumns[i] !== targetColumn) {
      var otherColumn = document.getElementById(otherColumns[i]);
      otherColumn.innerHTML = otherColumn.innerHTML.replace(idText, "");
    }
  }
}

function getNameById(id) {
  switch (id) {
    case 1:
      return "Tribunary River";
    case 2:
      return "E. Villanueva Ave.";
    case 3:
      return "Toclong II St.";
    default:
      return "Unknown";
  }
}
// Function to gather and compare recent data for board 1
function compareWaterLevelChanges(boardId) {
  var dbPath = 'SensorData/' + uid.toString() + '/readings';
  var changesDataRef = database.ref(dbPath);

  changesDataRef.orderByChild("boardId").equalTo(boardId + ".00").limitToLast(144).once('value', function (snapshot) {
    var readings = snapshot.val();
    var latestReading = null;
    var previousReading = null;
    var previousWaterLevelHighest = -Infinity;

    snapshot.forEach(function (childSnapshot) {
      var reading = childSnapshot.val();

      if (latestReading === null) {
        latestReading = reading;
      } else if (reading.timestamp > latestReading.timestamp) {
        previousReading = latestReading;
        latestReading = reading;
      } else if (previousReading === null || reading.timestamp > previousReading.timestamp) {
        previousReading = reading;
      }
    });

    if (latestReading === null || previousReading === null) {
      console.log("Insufficient data for comparison on board " + boardId + ".");
      return;
    }

    var latestTime = latestReading.timestamp;
    
    snapshot.forEach(function (childSnapshot) {
      var reading = childSnapshot.val();
      var objFloatId = reading.boardId;
      var objtime = reading.timestamp;
      var objid = parseInt(objFloatId);

      // Skip the latest reading
      if (reading.timestamp !== latestTime) {
        var waterLevel = parseFloat(reading.waterlevelpressure);

        if (waterLevel > previousWaterLevelHighest) {
          previousWaterLevelHighest = waterLevel;
          previousTimeHighest = reading.timestamp;
        }
      }
      
      if (objid == 1) {
        var h2Element1 = document.getElementById("h2_1");
        if ((objtime * 1000) >= twentyFourHoursAgo) {
          maxPressureObj1 = previousWaterLevelHighest;
        } else if ((objtime * 1000) < twentyFourHoursAgo) {
          maxPressureObj1 = 0;
        }
        h2Element1.innerHTML = "Tributary River: " + maxPressureObj1 + "cm";
      } else if (objid == 2) {
        var h2Element2 = document.getElementById("h2_2");
        if ((objtime * 1000) >= twentyFourHoursAgo) {
          maxPressureObj2 = previousWaterLevelHighest;
        } else if ((objtime * 1000) < twentyFourHoursAgo) {
          maxPressureObj2 = 0;
        }
        h2Element2.innerHTML = "E. Villanueva St.: " + maxPressureObj2 + "cm";
      } else if (objid == 3) {
        var h2Element3 = document.getElementById("h2_3");
        if ((objtime * 1000) >= twentyFourHoursAgo) {
          maxPressureObj3 = previousWaterLevelHighest;
        } else if ((objtime * 1000) < twentyFourHoursAgo) {
          maxPressureObj3 = 0;
        }
        h2Element3.innerHTML = "Toclong II St.: " + maxPressureObj3 + "cm";
      }

    });
  });



  // Retrieve the latest 10 readings for the specified board
  changesDataRef.orderByChild("boardId").equalTo(boardId + ".00").limitToLast(10).once('value', function (snapshot) {
    var readings = snapshot.val();

    if (readings === null) {
      console.log("No data found for board " + boardId + ".");
      return;
    }

    var latestReading = null;
    var previousReading = null;

    // Iterate over the readings to find the latest and previous readings
    snapshot.forEach(function (childSnapshot) {
      var reading = childSnapshot.val();

      if (latestReading === null) {
        latestReading = reading;
      } else if (reading.timestamp > latestReading.timestamp) {
        previousReading = latestReading;
        latestReading = reading;
      } else if (previousReading === null || reading.timestamp > previousReading.timestamp) {
        previousReading = reading;
      }
    });

    if (latestReading === null || previousReading === null) {
      console.log("Insufficient data for comparison on board " + boardId + ".");
      return;
    }

    var latestTime = latestReading.timestamp;
    console.log("latestTime:", latestTime);
    var latestWaterLevel = parseFloat(latestReading.waterlevelpressure);
    var previousTime = previousReading.timestamp;
    console.log("previousTime:", previousTime);
    var previousWaterLevel = parseFloat(previousReading.waterlevelpressure);

    // var significantChangeThreshold = 1; // Define the threshold for significant water level change



    // Find the highest water level from the previous readings except the latest reading (to avoid false positives)

    var previousWaterLevelHighest = -Infinity;

    // Iterate over the readings to find the highest water level except the latest reading
    snapshot.forEach(function (childSnapshot) {
      var reading = childSnapshot.val();

      // Skip the latest reading
      if (reading.timestamp !== latestTime) {
        var waterLevel = parseFloat(reading.waterlevelpressure);

        if (waterLevel > previousWaterLevelHighest) {
          previousWaterLevelHighest = waterLevel;
          previousTimeHighest = reading.timestamp;
        }
      }
    });
    var timeDiff = latestTime * 1000 - previousTimeHighest * 1000;
    var timeDiffnow = Date.now() - previousTimeHighest * 1000;
    console.log("previousWaterLevelHighest:", previousWaterLevelHighest);
    var waterLevelDiff = latestWaterLevel - previousWaterLevelHighest;
    console.log("previousWaterLevel:", previousWaterLevel);
    console.log("waterLevelDiff:", waterLevelDiff);
    // Check if the water level difference is significant
    // if (Math.abs(waterLevelDiff) < significantChangeThreshold) {
    //   var oh2Element2 = document.getElementById("oh2_" + boardId);
    //   oh2Element2.innerHTML = "Insufficient water level change";
    //   console.log("Insufficient water level change for comparison on board " + boardId + ".");
    //   return;
    // } else {
    var oh2Element2 = document.getElementById("oh2_" + boardId);
    oh2Element2.innerHTML = "Water level difference: " + waterLevelDiff + " cm";
    // }

    var secondsDiff = Math.floor(timeDiff / 1000);
    var days = Math.floor(secondsDiff / (24 * 60 * 60));
    var hours = Math.floor((secondsDiff % (24 * 60 * 60)) / (60 * 60));
    var minutes = Math.floor((secondsDiff % (60 * 60)) / 60);
    var seconds = secondsDiff % 60;
    var timeAgo = "";

    if (days > 0) {
      timeAgo = days + " days ago";
    } else if (hours > 0) {
      timeAgo = hours + " hours ago";
    } else if (minutes > 0) {
      timeAgo = minutes + " minutes ago";
    } else {
      timeAgo = seconds + " seconds ago";
    }

    var secondsDiffnow = Math.floor(timeDiffnow / 1000);
    var daysnow = Math.floor(secondsDiffnow / (24 * 60 * 60));
    var hoursnow = Math.floor((secondsDiffnow % (24 * 60 * 60)) / (60 * 60));
    var minutesnow = Math.floor((secondsDiffnow % (60 * 60)) / 60);
    var secondsnow = secondsDiffnow % 60;
    var timeAgonow = "";

    if (daysnow > 0) {
      timeAgonow = daysnow + " days ago";
    } else if (hoursnow > 0) {
      timeAgonow = hoursnow + " hours ago";
    } else if (minutesnow > 0) {
      timeAgonow = minutesnow + " minutes ago";
    } else {
      timeAgonow = secondsnow + " seconds ago";
    }

    var oh2Element1 = document.getElementById("oh1_" + boardId);
    oh2Element1.innerHTML = "Time difference from previous reading: " + timeAgo + "<br> (" + timeAgonow + ")";

    console.log("Time difference (Board " + boardId + "):", timeDiff, "minutes");
    console.log("Water level difference (Board " + boardId + "):", waterLevelDiff, "cm");

    // // Create a Highcharts chart container
    // var chartContainer = document.createElement("div");
    // chartContainer.setAttribute("id", "chart_" + boardId);
    // document.body.appendChild(chartContainer);

    // // Generate the Highcharts chart
    // Highcharts.chart("chart_" + boardId, {
    //   title: {
    //     text: null
    //   },
    //   xAxis: {
    //     categories: ["Previous", "Latest"]
    //   },
    //   yAxis: {
    //     title: {
    //       text: "Water Level"
    //     }
    //   },
    //   series: [{
    //     name: "Water Level",
    //     data: [previousWaterLevel, latestWaterLevel]
    //   }]
    // });
    var chartContainer = document.createElement("div");
    chartContainer.setAttribute("id", "chart_" + boardId);
    document.body.appendChild(chartContainer);

    // Prepare the data for the chart
    var chartData = [];
    snapshot.forEach(function (childSnapshot) {
      var reading = childSnapshot.val();
      var timestamp = epochToDateTime(reading.timestamp);
      var waterLevel = parseFloat(reading.waterlevelpressure);
      chartData.push([timestamp, waterLevel]);
    });

    // Sort the data in ascending order based on timestamp
    chartData.sort(function (a, b) {
      return a[0] - b[0];
    });

    // Generate the Highcharts chart
    Highcharts.chart("chart_" + boardId, {
      chart: {
        type: "column",
        height: 250 // Adjust the height as per your requirement
      },
      title: {
        text: null // Remove the chart title
      },
      xAxis: {
        type: "datetime",
        title: {
          text: "Timestamp"
        }
      },
      yAxis: {
        title: {
          text: "Water Level Pressure"
        }
      },
      series: [{
        name: "Water Level",
        data: chartData
      }],
      legend: {
        enabled: false // Remove the legend if not needed
      }
    });
  });
}

// Call the function for board 1, board 2, and board 3
compareWaterLevelChanges("1");
compareWaterLevelChanges("2");
compareWaterLevelChanges("3");
function initMap() {
  var sensor1LastUpdated = null;
  var sensor2LastUpdated = null;
  var sensor3LastUpdated = null;
  var sensorMarkers = [];
  var sensorData = ""; // Define sensorData variable outside of the event listener
  var rangeCircle;

  var infowindow = new google.maps.InfoWindow(); // Declare the infowindow variable outside the event listener

  var map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 14.439817922996339, lng: 120.92960169120573 }, // Target coordinates
    zoom: 17, // Zoom level
    styles: [{
      featureType: 'poi',
      stylers: [{ visibility: 'off' }] // Hide Points of Interest (POI) markers
    }
      // Add more style rules as needed to customize the map appearance
    ]
  });
  function checkAndUpdateCircleColor(sensorId, sensorLastUpdated) {
    var currentTime = new Date().getTime(); // Get current timestamp in milliseconds
    // var twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    var twentyFourHours = 1 * 60 * 60 * 1000; // 1 hours in milliseconds
    // console.log("currentTime:", currentTime);
    // console.log("sensorLastUpdated:", sensorLastUpdated);
    if (sensorLastUpdated && currentTime - sensorLastUpdated >= twentyFourHours) {
      // console.log("Didnt update!: Board ", sensorId);
      // If no recent update (24 hours or more), change the circle color back to green
      sensorMarkers[sensorId].rangeCircle.setOptions({ fillColor: "green" });
    } else {
      // Otherwise, keep the existing circle color
      // console.log("Did update (within 24hours)!: Board ", sensorId);
      return;
    }
  }
  // Function to create a sensor marker
  function createSensorMarker(sensorLatLng, title, sensorId, rangeRadius, initialColor) {
    var marker = new google.maps.Marker({
      position: sensorLatLng,
      map: map,
      title: title,
      animation: google.maps.Animation.DROP,
      label: {
        text: title,
        color: '#404040',
        fontWeight: 'bold',
        labelOrigin: new google.maps.Point(0, 32)
      }
    });

    var rangeCircle = new google.maps.Circle({
      strokeColor: "gray",
      strokeOpacity: 0.8,
      fillColor: initialColor,
      strokeWeight: 2,
      fillColor: "green",
      fillOpacity: 0.35,
      center: sensorLatLng,
      radius: rangeRadius,
      map: map
    });

    marker.addListener("click", function () {
      var sensorData = sensorMarkers[sensorId].data;
      var infowindow = new google.maps.InfoWindow({
        content: "Sensor ID: " + sensorId +
          "<br>Water Level: " + sensorData.waterlevel +
          "<br>Pressure: " + sensorData.pressure +
          "<br>Temperature: " + sensorData.temperature +
          "<br>Humidity: " + sensorData.humidity +
          "<br>Battery Level: " + sensorData.batteryLevel + "%"
      });
      infowindow.open(map, marker);
    });

    sensorMarkers[sensorId] = { marker: marker, rangeCircle: rangeCircle, data: {} };
  }

  // Create the first sensor marker
  var sensor1LatLng = { lat: 14.440703903499237, lng: 120.92957878388968 }; // Replace with actual sensor location
  createSensorMarker(sensor1LatLng, "Toclong II St.", 3, 85, "green");

  // Create the second sensor marker
  var sensor2LatLng = { lat: 14.438773, lng: 120.929984 }; // Replace with actual sensor location
  createSensorMarker(sensor2LatLng, "E. Villanueva Ave.", 2, 85, "green");

  // Create the third sensor marker
  var sensor3LatLng = { lat: 14.440837, lng: 120.930466 }; // Replace with actual sensor location
  createSensorMarker(sensor3LatLng, "Tributary River", 1, 50, "green");

  function updateRangeCircle(centerLatLng, radius) {
    if (rangeCircle) {
      rangeCircle.setMap(null); // Remove the existing range circle
    }
    rangeCircle = new google.maps.Circle({
      strokeColor: "gray",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "green",
      fillOpacity: 0.35,
      center: centerLatLng,
      radius: radius,
      map: map
    });
  }

  obj3DataRef.orderByChild("boardId").equalTo("3.00").limitToLast(1).on('child_added', function (snapshot) {

    // console.log("new_readings", e.data);
    var obj = snapshot.toJSON();
    var objFloatId = obj.boardId;
    var objid = parseInt(objFloatId);
    var objbattery = obj.battery;
    var objhum = obj.humidity;
    var objreadingid = obj.readingId;
    var objtemp = obj.temperature;
    var objtime = obj.timestamp;
    var objlvl = obj.waterlevel;
    var objpres = obj.waterlevelpressure;
    if (objid === 3) {
      sensorMarkers[3].data = {
        waterlevel: obj.waterlevel,
        pressure: objpres,
        temperature: obj.temperature,
        humidity: obj.humidity,
        batteryLevel: obj.battery
      };

      // Update the range circle color based on the water level for sensor 3
      if (objpres >= 10 && objpres <= 15) {
        sensorMarkers[3].rangeCircle.setOptions({ fillColor: "orange" });
      } else if (objpres > 15 && objpres <= 200) {
        sensorMarkers[3].rangeCircle.setOptions({ fillColor: "red" });
      } else {
        sensorMarkers[3].rangeCircle.setOptions({ fillColor: "green" });
      }
      sensor3LastUpdated = objtime * 1000; // Convert epoch time to JavaScript Date object

      // Call the function to check and update circle color for sensor 3
      checkAndUpdateCircleColor(3, sensor3LastUpdated);
    }
  }, false);
  obj2DataRef.orderByChild("boardId").equalTo("2.00").limitToLast(1).on('child_added', function (snapshot) {

    // console.log("new_readings", e.data);
    var obj = snapshot.toJSON();
    var objFloatId = obj.boardId;
    var objid = parseInt(objFloatId);
    var objbattery = obj.battery;
    var objhum = obj.humidity;
    var objreadingid = obj.readingId;
    var objtemp = obj.temperature;
    var objtime = obj.timestamp;
    var objlvl = obj.waterlevel;
    var objpres = obj.waterlevelpressure;
    if (objid === 2) {
      sensorMarkers[2].data = {
        waterlevel: obj.waterlevel,
        pressure: objpres,
        temperature: obj.temperature,
        humidity: obj.humidity,
        batteryLevel: obj.battery
      };

      // Update the range circle color based on the water level for sensor 2
      if (objpres >= 10 && objpres <= 15) {
        sensorMarkers[2].rangeCircle.setOptions({ fillColor: "orange" });
      } else if (objpres > 15 && objpres <= 200) {
        sensorMarkers[2].rangeCircle.setOptions({ fillColor: "red" });
      } else {
        sensorMarkers[2].rangeCircle.setOptions({ fillColor: "green" });
      }
      sensor2LastUpdated = objtime * 1000; // Convert epoch time to JavaScript Date object

      // Call the function to check and update circle color for sensor 3
      checkAndUpdateCircleColor(2, sensor2LastUpdated);
    }
  }, false);
  obj1DataRef.orderByChild("boardId").equalTo("1.00").limitToLast(1).on('child_added', function (snapshot) {
    // console.log("new_readings", e.data);
    var obj = snapshot.toJSON();
    var objFloatId = obj.boardId;
    var objid = parseInt(objFloatId);
    var objbattery = obj.battery;
    var objhum = obj.humidity;
    var objreadingid = obj.readingId;
    var objtemp = obj.temperature;
    var objtime = obj.timestamp;
    var objlvl = obj.waterlevel;
    var objpres = obj.waterlevelpressure;
    if (objid === 1) {

      sensorMarkers[1].data = {
        waterlevel: obj.waterlevel,
        pressure: obj.waterlevelpressure,
        temperature: obj.temperature,
        humidity: obj.humidity,
        batteryLevel: obj.battery
      };

      // Update the range circle color based on the water level for sensor 1
      if (objpres >= 10 && objpres <= 15) {
        sensorMarkers[1].rangeCircle.setOptions({ fillColor: "orange" });
      } else if (objpres > 15 && objpres <= 200) {
        sensorMarkers[1].rangeCircle.setOptions({ fillColor: "red" });
      } else {
        sensorMarkers[1].rangeCircle.setOptions({ fillColor: "green" });
      }
      sensor1LastUpdated = objtime * 1000; // Convert epoch time to JavaScript Date object

      // Call the function to check and update circle color for sensor 3
      checkAndUpdateCircleColor(1, sensor1LastUpdated);
    }
  }, false);

}
initMap();
window.jsPDF = window.jspdf.jsPDF
// Event listener for the download button
// Event listener for the download button
document.getElementById('download-btn').addEventListener('click', function () {
  // Capture the web page using html2canvas
  html2canvas(document.body, {
    scrollY: -window.scrollY, // Capture the entire page by scrolling
    windowWidth: document.documentElement.offsetWidth, // Set the width of the captured screenshot
    windowHeight: document.documentElement.offsetHeight, // Set the height of the captured screenshot
    useCORS: true // Enable CORS to capture images from external sources
  }).then(function (canvas) {
    var imgData = canvas.toDataURL('image/png');
    var doc = new jsPDF('landscape'); // Set the orientation to landscape
    var pdfWidth = doc.internal.pageSize.getWidth();
    var pdfHeight = doc.internal.pageSize.getHeight();
    var imgHeight = (canvas.height * pdfWidth) / canvas.width;
    var remainingHeight = imgHeight;

    var pageHeight = pdfHeight - 20; // Adjust the margin to suit your needs

    // Calculate the number of required pages
    var numPages = Math.ceil(imgHeight / pageHeight);

    for (var pageNumber = 0; pageNumber < numPages; pageNumber++) {
      if (pageNumber > 0) {
        doc.addPage();
      }
      var heightPosition = -pageNumber * pageHeight;
      doc.addImage(imgData, 'PNG', 0, heightPosition, pdfWidth, imgHeight, null, 'FAST');
    }

    // Generate a unique name for the PDF file using the current date and time
    var now = new Date();
    var fileName = 'FLOOD-ALERT-ALL-REPORT_' + now.toLocaleDateString().replace(/\//g, '-') + '_' + now.toLocaleTimeString().replace(/:/g, '');

    // Download the PDF with the generated file name
    doc.save(fileName + '.pdf');
  });
});