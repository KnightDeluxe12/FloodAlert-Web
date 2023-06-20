var uid = 'TPxW3qcPKldbeuZkSYjGJv08PBj2';
var dbPath = 'SensorData/' + uid.toString() + '/readings';
var dbfloodRiskPath = 'SensorData/' + uid.toString() + '/FloodRiskData';
var floodRiskDataRef = database.ref(dbfloodRiskPath).orderByKey()
var boardDataRef = database.ref(dbPath).orderByKey();

// Create a function that creates a historical data analysis chart that compares the water level pressure changes from the last 50 readings from board 1,2,3
//  Make it interactive with some radio buttons to toggle board 1,2,3 or flood risk chart and with 1h,2h,12h and 24h time intervals buttons

function fetchHistoryData(boardId) {
  var dbPath = 'SensorData/' + uid.toString() + '/readings';
  var changesDataRef = database.ref(dbPath);

  // Retrieve the latest 10 readings for the specified board
  boardDataRef.orderByChild("boardId").equalTo(boardId + ".00").limitToLast(50).once('value', function (snapshot) {
    var readings = snapshot.val();

    // readings.waterlevelpressure contains the waterlevelpressure data and the readings.timestamp contains the timestamp