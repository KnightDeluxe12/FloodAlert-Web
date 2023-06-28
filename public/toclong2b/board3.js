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
var dbfloodRiskPath = 'SensorData/' + uid.toString() + '/FloodRiskData';

var floodRiskDataRef = database.ref(dbfloodRiskPath).orderByKey();
var boardDataRef = database.ref(dbPath).orderByKey();
var twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
var oneHourAgo = Date.now() - 1 * 60 * 60 * 1000;

function convertToCSV(data) {
  var csv = "";
  var headers = Object.keys(data[0]);

  // Append headers
  csv += headers.join(",") + "\n";

  // Append data rows
  data.forEach(function (row) {
    var values = headers.map(function (header) {
      return row[header];
    });
    csv += values.join(",") + "\n";
  });

  return csv;
}

// Function to download CSV file
function downloadCSV(data, filename) {
  var csv = convertToCSV(data);

  // Create a temporary link element
  var link = document.createElement("a");
  link.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
  link.setAttribute("download", filename);

  // Simulate click to initiate download
  link.click();
}

function fetchHistoryData(boardId) {
  var dbPath = 'SensorData/' + uid.toString() + '/readings';
  var boardDataRef = database.ref(dbPath);

  // Retrieve the latest 50 readings for the specified board
  boardDataRef.orderByChild("boardId").equalTo(boardId + ".00").limitToLast(50).once('value', function (snapshot) {
    var readings = snapshot.val();

    // Check if any readings exist
    if (readings) {
      // Get the mastertableContainer element
      var mastertableContainer = document.getElementById("mastertableContainer");

      // Create a title element
      var title = document.createElement("h2");
      title.classList.add("text-center");
      title.textContent = "";

      // Create a table element with Bootstrap classes
      var table = document.createElement("table");
      table.classList.add("table", "table-striped", "table-hover", "table-bordered");

      // Create table headers with Bootstrap classes
      var headers = ["Timestamp", "Water Level Pressure", "Water Level", "Temperature", "Humidity", "Battery", "Reading ID", "Board ID"];
      var headerRow = document.createElement("tr");

      for (var i = 0; i < headers.length; i++) {
        var headerCell = document.createElement("th");
        headerCell.classList.add("text-center");
        headerCell.textContent = headers[i];
        headerRow.appendChild(headerCell);
      }

      table.appendChild(headerRow);

      // Calculate the number of pages based on the number of readings and the limit per page
      var numReadings = Object.keys(readings).length;
      var limitPerPage = 10;
      var numPages = Math.ceil(numReadings / limitPerPage);

      // Set the initial page to 1
      var currentPage = 1;

      // Function to display the readings for the current page
      function displayReadings() {
        // Clear the table body
        var tableBody = table.getElementsByTagName("tbody")[0];
        if (tableBody) {
          tableBody.innerHTML = "";
        } else {
          tableBody = document.createElement("tbody");
          table.appendChild(tableBody);
        }

        // Calculate the start and end indices for the current page
        var startIndex = (currentPage - 1) * limitPerPage;
        var endIndex = Math.min(startIndex + limitPerPage, numReadings);

        // Iterate over the readings and create table rows for the current page
        Object.keys(readings).slice(startIndex, endIndex).forEach(function (key) {
          var reading = readings[key];

          var timestamp = epochToDateTime(reading.timestamp);
          var waterLevelPressure = reading.waterlevelpressure;
          var waterLevel = reading.waterlevel;
          var temperature = reading.temperature;
          var humidity = reading.humidity;
          var battery = reading.battery;
          var readingId = reading.readingId;
          var boardId = reading.boardId;

          // Create a new table row
          var row = document.createElement("tr");

          // Create table cells for each data field with Bootstrap classes
          var timestampCell = document.createElement("td");
          timestampCell.classList.add("text-center");
          timestampCell.textContent = timestamp;
          row.appendChild(timestampCell);

          var waterLevelPressureCell = document.createElement("td");
          waterLevelPressureCell.classList.add("text-center");
          waterLevelPressureCell.textContent = waterLevelPressure;
          row.appendChild(waterLevelPressureCell);

          var waterLevelCell = document.createElement("td");
          waterLevelCell.classList.add("text-center");
          waterLevelCell.textContent = waterLevel;
          row.appendChild(waterLevelCell);

          var temperatureCell = document.createElement("td");
          temperatureCell.classList.add("text-center");
          temperatureCell.textContent = temperature;
          row.appendChild(temperatureCell);

          var humidityCell = document.createElement("td");
          humidityCell.classList.add("text-center");
          humidityCell.textContent = humidity;
          row.appendChild(humidityCell);

          var batteryCell = document.createElement("td");
          batteryCell.classList.add("text-center");
          batteryCell.textContent = battery;
          row.appendChild(batteryCell);

          var readingIdCell = document.createElement("td");
          readingIdCell.classList.add("text-center");
          readingIdCell.textContent = readingId;
          row.appendChild(readingIdCell);

          var boardIdCell = document.createElement("td");
          boardIdCell.classList.add("text-center");
          boardIdCell.textContent = boardId;
          row.appendChild(boardIdCell);

          // Append the row to the table body
          tableBody.appendChild(row);
        });
      }

      var pagination = document.createElement("nav");
      pagination.setAttribute("aria-label", "Pagination");
      pagination.innerHTML = `
        <ul class="pagination justify-content-center">
          <li class="page-item" id="previousBtn">
            <a class="page-link" href="#" aria-label="Previous">
              <span aria-hidden="true">&laquo;</span>
            </a>
          </li>
        </ul>
      `;

      var paginationList = pagination.querySelector(".pagination");

      // Function to handle page navigation
      function navigateToPage(page) {
        currentPage = page;
        displayReadings();

        // Update active state of pagination buttons
        var pageLinks = paginationList.getElementsByClassName("page-link");
        for (var i = 0; i < pageLinks.length; i++) {
          if (i + 1 === page) {
            pageLinks[i].parentElement.classList.add("active");
          } else {
            pageLinks[i].parentElement.classList.remove("active");
          }
        }
      }

      // Handle previous button click
      var previousBtn = pagination.querySelector("#previousBtn");
      previousBtn.addEventListener("click", function (event) {
        event.preventDefault();
        if (currentPage > 1) {
          navigateToPage(currentPage - 1);
        }
      });

      // Display the initial readings
      displayReadings();

      // Create pagination links dynamically
      for (var i = 1; i <= numPages; i++) {
        var pageLink = document.createElement("a");
        pageLink.classList.add("page-link");
        pageLink.href = "#";
        pageLink.textContent = i;
        pageLink.addEventListener("click", function (event) {
          event.preventDefault();
          navigateToPage(parseInt(this.textContent));
        });

        var pageItem = document.createElement("li");
        pageItem.classList.add("page-item");
        if (i === currentPage) {
          pageItem.classList.add("active");
        }
        pageItem.appendChild(pageLink);

        paginationList.appendChild(pageItem);
      }

      // Append the title and table to the mastertableContainer

      mastertableContainer.appendChild(title);
      mastertableContainer.appendChild(table);
      mastertableContainer.appendChild(pagination);

      var dataForCSV = Object.keys(readings).map(function (key) {
        var reading = readings[key];

        return {
          Timestamp: reading.timestamp,
          "Water Level Pressure": reading.waterlevelpressure,
          "Water Level": reading.waterlevel,
          Temperature: reading.temperature,
          Humidity: reading.humidity,
          Battery: reading.battery,
          "Reading ID": reading.readingId,
          "Board ID": reading.boardId
        };
      });

      function exportToCSV() {
        // Prompt the user to enter a filename
        var filename = prompt("Enter the filename for the CSV file:", "data.csv");

        // Check if a filename was provided
        if (filename) {
          // Download the data as a CSV file
          downloadCSV(dataForCSV, filename);
        }
      }

      function sortTableByTimestamp() {
        var tableBody = document.querySelector("#tableContainer tbody");
        var rows = Array.from(tableBody.getElementsByTagName("tr"));
    
        rows.sort(function (rowA, rowB) {
          var timestampA = rowA.cells[0].textContent;
          var timestampB = rowB.cells[0].textContent;
    
          return new Date(timestampA) - new Date(timestampB);
        });
    
        // Append the sorted rows back to the table body
        rows.forEach(function (row) {
          tableBody.appendChild(row);
        });
      }

      // Create a container for export button and pagination
      var exportContainer = document.createElement("div");
      exportContainer.classList.add("d-flex", "justify-content-between", "align-items-center");

      // Create a button for CSV export
      var exportButton = document.createElement("button");
      exportButton.textContent = "Export to CSV";
      exportButton.classList.add("btn", "btn-primary");
      exportButton.addEventListener("click", exportToCSV);

      tableContainer.appendChild(title);
      tableContainer.appendChild(table);
    
      tableContainer.appendChild(title);
      tableContainer.appendChild(table);
    
      // Create a button for table sorting
      var sortButton = document.createElement("button");
      sortButton.textContent = "Sort by Timestamp";
      sortButton.classList.add("btn", "btn-primary", "ml-2"); // Add Bootstrap classes
      sortButton.addEventListener("click", sortTableByTimestamp);
    
      // Get the pagination element
      var pagination = mastertableContainer.querySelector("nav[aria-label='Pagination']");
    
      // Create a container for the export button, table sorting, and pagination
      var actionsContainer = document.createElement("div");
      actionsContainer.classList.add("d-flex", "justify-content-between", "align-items-center");
    
      // Append the export button, table sorting button, and pagination to the container
      actionsContainer.appendChild(exportButton);
      actionsContainer.appendChild(sortButton);
      actionsContainer.appendChild(pagination);
    
      // Append the container to the mastertableContainer
      mastertableContainer.appendChild(actionsContainer);
    } else {
      console.log("No readings found for the specified board.");
    }
  });
}




fetchHistoryData("3");