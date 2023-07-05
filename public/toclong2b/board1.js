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

function updateTime() {
  var date = new Date();
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  var dateTimeString = date.toLocaleDateString(undefined, options) + " " + date.toLocaleTimeString();
  document.getElementById("timeSpan").innerText = dateTimeString;
}

// Update the time every second
setInterval(updateTime, 1000);

// Reference the specific location in your database
var uid = 'TPxW3qcPKldbeuZkSYjGJv08PBj2';
var dbPath = 'SensorData/' + uid.toString() + '/readings';
var dbfloodRiskPath = 'SensorData/' + uid.toString() + '/FloodRisk  Data';

var floodRiskDataRef = database.ref(dbfloodRiskPath).orderByKey();
var boardDataRef = database.ref(dbPath).orderByKey();
var twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
var oneHourAgo = Date.now() - 1 * 60 * 60 * 1000;

document.addEventListener("DOMContentLoaded", function () {
  let lastKey = null;

  function fetchBoardData(boardId, numItems) {
    var dbPath = 'SensorData/' + uid.toString() + '/readings';
    var boardDataRef = database.ref(dbPath);

    let query = boardDataRef.orderByChild("boardId").limitToLast(numItems + 1);

    if (lastKey) {
      query = query.endAt(boardId + ".00", lastKey);
    } else {
      query = query.equalTo(boardId + ".00");
    }

    query.once('value', (snapshot) => {
      let readings = snapshot.val();
      let html = '';
      let keys = Object.keys(readings);

      // Skip the last item (which is the first item of previous page)
      let dataKeys = (lastKey) ? keys.slice(0, -1) : keys.slice(0);

      // Update lastKey for next query
      lastKey = keys[0];

      for (let key of dataKeys) {
        let reading = readings[key];
        let timestamp = epochToDateTime(reading.timestamp);
        let row = '<tr>';
        row += '<td>' + timestamp + '</td>';
        row += '<td>' + reading.waterlevelpressure + '</td>';
        row += '<td>' + reading.waterlevel + '</td>';
        row += '<td>' + reading.temperature + '</td>';
        row += '<td>' + reading.humidity + '</td>';
        row += '<td>' + reading.battery + '</td>';
        row += '<td>' + reading.readingId + '</td>';
        row += '<td>' + reading.boardId + '</td>';
        row += '</tr>';
        html = row + html;
      }
      document.getElementById('table-body').insertAdjacentHTML('beforeend', html);
    });
  }

  // Call fetchBoardData function initially with 180 items
  fetchBoardData(1, 180);

  // Event listener for the Load More button
  document.getElementById('load-more-btn').addEventListener('click', function () {
    fetchBoardData(1, 180);
  });


  document.getElementById('download-btn').addEventListener('click', function () {
    let csv = [];
    let rows = document.querySelectorAll("#data-table tr");

    for (let i = 0; i < rows.length; i++) {
      let row = [], cols = rows[i].querySelectorAll("td, th");

      for (let j = 0; j < cols.length; j++) {
        row.push(cols[j].innerText);
      }

      csv.push(row.join(","));
    }

    downloadCSV(csv.join("\n"), generateFileName());
  });

  function generateFileName() {
    let today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `Toclong II St. (B) ${today}.csv`;
  }

  function downloadCSV(csv, filename) {
    let csvFile = new Blob([csv], { type: "text/csv" });
    let downloadLink = document.createElement("a");

    downloadLink.download = filename;
    downloadLink.href = URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);

    downloadLink.click();
  }

});

// Call the function with the boardId you want to fetch

document.getElementById("csvFileInput").addEventListener("change", handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const csvData = e.target.result;
    const parsedData = parseCsvData(csvData);
    console.log("csvData: ", parsedData);
    generateReport(parsedData);
    generateChart(parsedData);
    generateSummary(parsedData)
  };
  reader.readAsText(file);
}
function parseCsvData(data) {
  const rows = data.split("\n");
  const result = [];
  const headers = rows[0].split(",");

  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    const currentRow = rows[i].split(",");
    for (let j = 0; j < headers.length; j++) {
      if (headers[j] === "Timestamp") {
        obj[headers[j]] = currentRow[j]; // Preserve timestamp as a string
      } else if (isNaN(parseFloat(currentRow[j]))) {
        obj[headers[j]] = currentRow[j];
      } else {
        obj[headers[j]] = parseFloat(currentRow[j]);
      }
    }
    result.push(obj);
  }
  return result;
}
function generateReport(data) {
  const reportContainer = document.getElementById('report-container');
  reportContainer.innerHTML = ''; // Clear previous report

  const dates = [...new Set(data.map(row => row.Timestamp.split(' ')[0]))]; // Get unique dates

  dates.forEach(date => {
    const dateData = data.filter(row => row.Timestamp.startsWith(date));

    // Section for Minimum, Maximum, and Average values
    const minMaxAvgSection = document.createElement('div');
    minMaxAvgSection.classList.add('accordion-item');
    const modifiedDate = date.replace(/\//g, '-');
    const minMaxAvgHeader = document.createElement('h2');
    minMaxAvgHeader.classList.add('accordion-header');
    minMaxAvgHeader.innerHTML = `
      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${modifiedDate}" aria-expanded="false" aria-controls="collapse-${modifiedDate}">
        Minimum, Maximum, and Average values for ${modifiedDate}
      </button>
    `;

    const waterLevelPressure = dateData.map(row => row["Water Level Pressure"]);
    const temperature = dateData.map(row => row.Temperature);
    const humidity = dateData.map(row => row.Humidity);
    
    const minWaterLevelPressure = waterLevelPressure.length > 0 ? Math.min(...waterLevelPressure) : 'No data';
    const maxWaterLevelPressure = waterLevelPressure.length > 0 ? Math.max(...waterLevelPressure) : 'No data';
    const avgWaterLevelPressure = waterLevelPressure.length > 0 ? (waterLevelPressure.reduce((sum, value) => sum + value, 0) / waterLevelPressure.length).toFixed(2) : 'No data';
    
    const validTemperatures = temperature.filter(value => !isNaN(value));
    const minTemperature = validTemperatures.length > 0 ? Math.min(...validTemperatures) : 'No data';
    const maxTemperature = validTemperatures.length > 0 ? Math.max(...validTemperatures) : 'No data';
    const avgTemperature = validTemperatures.length > 0 ? (validTemperatures.reduce((sum, value) => sum + value, 0) / validTemperatures.length).toFixed(2) : 'No data';
    
    const validHumidity = humidity.filter(value => !isNaN(value));
    const minHumidity = validHumidity.length > 0 ? Math.min(...validHumidity) : 'No data';
    const maxHumidity = validHumidity.length > 0 ? Math.max(...validHumidity) : 'No data';
    const avgHumidity = validHumidity.length > 0 ? (validHumidity.reduce((sum, value) => sum + value, 0) / validHumidity.length).toFixed(2) : 'No data';
    

    const minMaxAvgContent = document.createElement('div');
    minMaxAvgContent.id = `collapse-${modifiedDate}`;
    minMaxAvgContent.classList.add('accordion-collapse', 'collapse');
    minMaxAvgContent.setAttribute('aria-labelledby', `heading-${modifiedDate}`);
    minMaxAvgContent.setAttribute('data-bs-parent', '#report-container');

    const minMaxAvgTable = document.createElement('table');
    minMaxAvgTable.classList.add('table');
    minMaxAvgTable.innerHTML = `
    <thead>
      <tr>
        <th>Variable</th>
        <th>Minimum</th>
        <th>Maximum</th>
        <th>Average</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Water Level</td>
        <td>${minWaterLevelPressure} cm</td>
        <td>${maxWaterLevelPressure} cm</td>
        <td>${avgWaterLevelPressure} cm</td>
      </tr>
      <tr>
        <td>Temperature</td>
        <td>${minTemperature} C</td>
        <td>${maxTemperature} C</td>
        <td>${avgTemperature} C</td>
      </tr>
      <tr>
        <td>Humidity</td>
        <td>${minHumidity} %</td>
        <td>${maxHumidity} %</td>
        <td>${avgHumidity} %</td>
      </tr>
    </tbody>
  `;

    minMaxAvgContent.appendChild(minMaxAvgTable);
    minMaxAvgSection.appendChild(minMaxAvgHeader);
    minMaxAvgSection.appendChild(minMaxAvgContent);

    // Section for Water Level Pressure at specific times
    const waterLevelSection = document.createElement('div');
    waterLevelSection.classList.add('accordion-item');

    const waterLevelHeader = document.createElement('h2');
    waterLevelHeader.classList.add('accordion-header');
    waterLevelHeader.innerHTML = `
      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-waterLevel-${modifiedDate}" aria-expanded="false" aria-controls="collapse-waterLevel-${modifiedDate}">
        Water Level at specific times on ${modifiedDate}
      </button>
    `;

    const waterLevelContent = document.createElement('div');
    waterLevelContent.id = `collapse-waterLevel-${modifiedDate}`;
    waterLevelContent.classList.add('accordion-collapse', 'collapse');
    waterLevelContent.setAttribute('aria-labelledby', `heading-waterLevel-${modifiedDate}`);
    waterLevelContent.setAttribute('data-bs-parent', '#report-container');

    const timeRanges = [
      { label: "4am", start: "04", end: "04" },
      { label: "8am", start: "08", end: "08" },
      { label: "12pm", start: "12", end: "12" },
      { label: "4pm", start: "16", end: "16" },
      { label: "8pm", start: "20", end: "20" },
      { label: "10pm", start: "22", end: "22" },
      { label: "12am", start: "00", end: "00" },
    ];

    const timeRows = timeRanges.map(range => `
      <tr>
        <td>${range.label}</td>
        <td>${getMaxWaterLevel(dateData, range.start, range.end)} cm</td>
        <td>${getAvgWaterLevel(dateData, range.start, range.end)} cm</td>
      </tr>
    `).join('');

    const waterLevelTable = document.createElement('table');
    waterLevelTable.classList.add('table');
    waterLevelTable.innerHTML = `
      <thead>
        <tr>
          <th>Time</th>
          <th>Maximum Water Level</th>
          <th>Average Water Level</th>
        </tr>
      </thead>
      <tbody>
        ${timeRows}
      </tbody>
    `;


    waterLevelContent.appendChild(waterLevelTable);
    waterLevelSection.appendChild(waterLevelHeader);
    waterLevelSection.appendChild(waterLevelContent);

    reportContainer.appendChild(minMaxAvgSection);
    reportContainer.appendChild(waterLevelSection);
  });
}

function getMaxWaterLevel(data, time) {
  const filteredData = data.filter(row => row.Timestamp.includes(time));
  const validData = filteredData.filter(row => !isNaN(row["Water Level Pressure"]));
  
  if (validData.length === 0) {
    return 'No data';
  }
  
  return Math.max(...validData.map(row => row["Water Level Pressure"]));
}

function getAvgWaterLevel(data, time) {
  const filteredData = data.filter(row => row.Timestamp.includes(time));
  const validData = filteredData.filter(row => !isNaN(row["Water Level Pressure"]));
  
  if (validData.length === 0) {
    return 'No data';
  }

  return (validData.reduce((sum, row) => sum + row["Water Level Pressure"], 0) / validData.length).toFixed(2);
}

function generateSummary(data) {
  const summaryContainer = document.getElementById('summary-container');
  summaryContainer.innerHTML = ''; // Clear previous summary

  const dates = [...new Set(data.map(row => row.Timestamp.split(' ')[0]))]; // Get unique dates

  dates.forEach(date => {
    const dateData = data.filter(row => row.Timestamp.startsWith(date));

    // Summary for Minimum, Maximum, and Average values
    const waterLevelPressure = dateData.map(row => row["Water Level Pressure"]);
    const temperature = dateData.map(row => row.Temperature);
    const humidity = dateData.map(row => row.Humidity);

    const minWaterLevelPressure = waterLevelPressure.length > 0 ? Math.min(...waterLevelPressure) : 'No data';
    const maxWaterLevelPressure = waterLevelPressure.length > 0 ? Math.max(...waterLevelPressure) : 'No data';
    const avgWaterLevelPressure = waterLevelPressure.length > 0 ? (waterLevelPressure.reduce((sum, value) => sum + value, 0) / waterLevelPressure.length).toFixed(2) : 'No data';

    const validTemperatures = temperature.filter(value => !isNaN(value));
    const minTemperature = validTemperatures.length > 0 ? Math.min(...validTemperatures) : 'No data';
    const maxTemperature = validTemperatures.length > 0 ? Math.max(...validTemperatures) : 'No data';
    const avgTemperature = validTemperatures.length > 0 ? (validTemperatures.reduce((sum, value) => sum + value, 0) / validTemperatures.length).toFixed(2) : 'No data';

    const validHumidity = humidity.filter(value => !isNaN(value));
    const minHumidity = validHumidity.length > 0 ? Math.min(...validHumidity) : 'No data';
    const maxHumidity = validHumidity.length > 0 ? Math.max(...validHumidity) : 'No data';
    const avgHumidity = validHumidity.length > 0 ? (validHumidity.reduce((sum, value) => sum + value, 0) / validHumidity.length).toFixed(2) : 'No data';
    const timeRanges = [
      { label: "4am", start: "04", end: "04" },
      { label: "8am", start: "08", end: "08" },
      { label: "12pm", start: "12", end: "12" },
      { label: "4pm", start: "16", end: "16" },
      { label: "8pm", start: "20", end: "20" },
      { label: "10pm", start: "22", end: "22" },
      { label: "12am", start: "00", end: "00" },
    ];

    const waterLevelSummarySentences = timeRanges.map(range => {
      const maxWaterLevel = getMaxWaterLevel(dateData, range.start, range.end);
      const avgWaterLevel = getAvgWaterLevel(dateData, range.start, range.end);
      return `At ${range.label}, the maximum water level was ${maxWaterLevel} cm and the average water level was ${avgWaterLevel} cm.`;
    });
    
    const cardContainer = document.createElement('div');
    cardContainer.classList.add('card');
    
    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header');
    cardHeader.textContent = 'Summary of Data on ' + date.replaceAll('/', '-').replaceAll(' ', 'T') + '';
    
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');
    
    const summarySentence = `The water level ranged from ${minWaterLevelPressure} cm to ${maxWaterLevelPressure} cm, with an average of ${avgWaterLevelPressure} cm. ${waterLevelSummarySentences.join(' ')}`;
    const summarySentence1 = `Meanwhile, The water level ranged from ${minWaterLevelPressure} cm to ${maxWaterLevelPressure} cm on that date, with an average of ${avgWaterLevelPressure} cm. The temperature ranged from ${minTemperature}°C to ${maxTemperature}°C, with an average of ${avgTemperature}°C. The humidity ranged from ${minHumidity}% to ${maxHumidity}%, with an average of ${avgHumidity}%.`;
    
    const summaryParagraph = document.createElement('p');
    summaryParagraph.textContent = summarySentence;
    
    const summaryParagraph1 = document.createElement('p');
    summaryParagraph1.textContent = summarySentence1;
    
    cardBody.appendChild(summaryParagraph);
    cardBody.appendChild(summaryParagraph1);
    
    cardContainer.appendChild(cardHeader);
    cardContainer.appendChild(cardBody);
    
    summaryContainer.appendChild(cardContainer);
  });
}

function generateChart(data) {
  // Extracting data arrays for each series
  const timestamps = data.map(row => row.Timestamp);
  const batteries = data.map(row => parseFloat(row.Battery));
  const waterLevelPressures = data.map(row => parseFloat(row["Water Level Pressure"]));
  const humidities = data.map(row => parseFloat(row.Humidity));
  const temperatures = data.map(row => parseFloat(row.Temperature));


  Highcharts.chart('chart-container', {
    chart: {
      zoomType: 'xy'
    },
    title: {
      text: 'Sensor Data'
    },
    xAxis: {
      categories: timestamps,
      crosshair: true
    },
    yAxis: [{ // Primary yAxis
      labels: {
        format: '{value} C',
        style: {
          color: Highcharts.getOptions().colors[2]
        }
      },
      title: {
        text: 'Temperature',
        style: {
          color: Highcharts.getOptions().colors[2]
        }
      },
      opposite: true
    }, { // Secondary yAxis
      gridLineWidth: 0,
      title: {
        text: 'Battery',
        style: {
          color: Highcharts.getOptions().colors[0]
        }
      },
      labels: {
        format: '{value} %',
        style: {
          color: Highcharts.getOptions().colors[0]
        }
      }
    }, { // Tertiary yAxis
      gridLineWidth: 1,
      title: {
        text: 'Water Level',
        style: {
          color: Highcharts.getOptions().colors[1]
        }
      },
      labels: {
        format: '{value} cm',
        style: {
          color: Highcharts.getOptions().colors[1]
        }
      },
      opposite: true
    }],
    tooltip: {
      shared: true
    },
    series: [{
      name: 'Battery',
      type: 'column',
      yAxis: 1,
      data: batteries,
      tooltip: {
        valueSuffix: ' %'
      }
    }, {
      name: 'Water Level',
      type: 'spline',
      yAxis: 2,
      data: waterLevelPressures,
      tooltip: {
        valueSuffix: ' cm'
      }
    }, {
      name: 'Temperature',
      type: 'spline',
      data: temperatures,
      tooltip: {
        valueSuffix: ' C'
      }
    }, {
      name: 'Humidity',
      type: 'spline',
      data: humidities,
      tooltip: {
        valueSuffix: ' %'
      }
    }]
  });
} 