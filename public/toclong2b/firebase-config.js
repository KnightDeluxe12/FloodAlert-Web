I want to optimize main esp32 receiver code and use deep sleep in order to save battery while receiving sensor data from esp32 slaves through esp now. How im going to do that? Here's my function code of my main esp32 receiver "void setup() {
void setup(){
  TinyGsmClient client(modem);
  SerialAT.begin(9600, SERIAL_8N1, MODEM_RX, MODEM_TX);

  modem.init();
  String modemInfo = modem.getModemInfo();
  Serial.println("Modem Info: " + modemInfo);
  Serial.begin(115200);

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(0, 18);
  display.println("Connecting to WiFi");
  display.display();
  delay(1500);

  Serial.println();
  Serial.print("Server MAC Address:  ");
  Serial.println(WiFi.macAddress());

  // Set the device as a Station and Soft Access Point simultaneously
  WiFi.mode(WIFI_AP_STA);
  // Set device as a Wi-Fi Station
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Setting as a Wi-Fi Station..");

    if (WiFi.status() != WL_CONNECTED) {
      display.clearDisplay();
      display.setTextColor(WHITE);
      display.setTextSize(1);
      display.setCursor(0, 18);
      display.println("Connecting to WiFi...");
      display.display();
      Serial.println("Failed to connect to default WiFi");
      delay(1000);

      // Connect to backup WiFi SSID and password
      WiFi.begin(backupSsid, backupPassword);

      // Wait for WiFi connection
      while (WiFi.status() != WL_CONNECTED) {
        display.clearDisplay();
        display.setTextColor(WHITE);
        display.setTextSize(1);
        display.setCursor(0, 18);
        display.println("Connecting to WiFi....");
        display.display();
        Serial.println("Connecting to backup WiFi...");
        delay(1000);
      }
    }
  }

  Serial.print("Server SOFT AP MAC Address:  ");
  Serial.println(WiFi.softAPmacAddress());

  chan = WiFi.channel();
  Serial.print("Station IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Wi-Fi Channel: ");
  Serial.println(WiFi.channel());
  // if (!MDNS.begin("thefloodalertPH")) {
  //   Serial.println("Error setting up MDNS responder!");
  //   while (1) {
  //     delay(1000);
  //   }
  // }
  // Serial.println("mDNS responder started");
  configTime(0, 0, ntpServer);

  // Assign the api key (required)
  config.api_key = API_KEY;

  // Assign the user sign in credentials
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  // Assign the RTDB URL (required)
  config.database_url = DATABASE_URL;

  Firebase.reconnectWiFi(true);
  fbdo.setResponseSize(4096);

  // Assign the callback function for the long running token generation task */
  config.token_status_callback = tokenStatusCallback;  //see addons/TokenHelper.h

  // Assign the maximum retry of token generation
  config.max_token_generation_retry = 5;

  // Initialize the library with the Firebase authen and config
  Firebase.begin(&config, &auth);

  // Getting the user UID might take a few seconds
  Serial.println("Getting User UID");
  while ((auth.token.uid) == "") {
    Serial.print('.');
    delay(1000);
  }
  // Print user UID
  uid = auth.token.uid.c_str();
  Serial.print("User UID: ");
  Serial.println(uid);
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(0, 18);
  display.println("Connected to Firebase");
  display.display();
  delay(2000);

  // Update database path

  initESP_NOW();

  databasePath = "/SensorData/" + uid + "/readings";
}

void loop() {
  static unsigned long lastEventTime = millis();
  static const unsigned long EVENT_INTERVAL_MS = 5000;
  if ((millis() - lastEventTime) > EVENT_INTERVAL_MS) {
    // events.send("ping", NULL, millis());
    lastEventTime = millis();
    readDataToSend();
    esp_now_send(NULL, (uint8_t *)&outgoingSetpoints, sizeof(outgoingSetpoints));
  }
  // static unsigned long currentSMMillis = millis();
  // if (currentSMMillis - smspreviousMillis >= smsInterval) {
  //   smspreviousMillis = millis();
  float waterLevel3 = fbdo3Pressure;
  float waterLevel2 = fbdo2Pressure;
  float waterLevel1 = fbdo1Pressure;

  int mmdaBoostvalue = 1;
  int nplvValuemin = 23 * mmdaBoostvalue;
  int nplvValuemax = 44 * mmdaBoostvalue;
  int npatvValuemax = 45 * mmdaBoostvalue;


  String smsMessage = "[FLOOD ALERT] Water Level Status in Toclong II-B:\n";
  smsMessage += "Time: " + getCurrentTime() + "\n";
  smsMessage += "Water Level Update:\n";
  String smsStatusTracker = "";
  messageToSend = false;
  //    Serial.println(smsMessage.length());

  if (waterLevel1 >= nplvValuemin && waterLevel1 < nplvValuemax) {
    smsMessage += "Tributary River: NPLV (Not Passable to Light Vehicles) - " + String(waterLevel1) + " units\n";
    smsStatusTracker += " B1:LV";
    messageToSend = true;
  } else if (waterLevel1 >= npatvValuemax && waterLevel1 < 150) {
    smsMessage += "Tributary River: NPATV (Not Passable to All Types of Vehicles) - " + String(waterLevel1) + " units\n";
    smsStatusTracker += " B1:AV";
    messageToSend = true;
  }

  if (waterLevel2 >= nplvValuemin && waterLevel2 < nplvValuemax) {
    smsMessage += "E. Villanueva Ave.: NPLV (Not Passable to Light Vehicles) - " + String(waterLevel2) + " units\n";
    smsStatusTracker += " B2:LV";
    messageToSend = true;
  } else if (waterLevel2 >= npatvValuemax && waterLevel2 < 150) {
    smsMessage += "E. Villanueva Ave.: NPATV (Not Passable to All Types of Vehicles) - " + String(waterLevel2) + " units\n";
    smsStatusTracker += " B2:AV";
    messageToSend = true;
  }

  if (waterLevel3 >= nplvValuemin && waterLevel3 < nplvValuemax) {
    smsMessage += "Toclong II St.: NPLV (Not Passable to Light Vehicles) - " + String(waterLevel3) + " units\n";
    smsStatusTracker += " B3:LV";
    messageToSend = true;
  } else if (waterLevel3 >= npatvValuemax && waterLevel3 < 150) {
    smsMessage += "Toclong II St.: NPATV (Not Passable to All Types of Vehicles) - " + String(waterLevel3) + " units\n";
    smsStatusTracker += " B3:AV";
    messageToSend = true;
  }

  if (fbSendState && Firebase.ready() && (millis() - sendDataPrevMillis > timerDelay || sendDataPrevMillis == 0)) {
    Serial.print("fbSendState: ");
    Serial.println(fbSendState);
    sendDataPrevMillis = millis();
    //Get current timestamp
    timestamp = getTime();
    Serial.print("time: ");
    Serial.println(timestamp);

    Serial.println("Device 1 Latest Reading:");
    Serial.println("Temperature: " + String(fbdo1Temperature));
    Serial.println("Humidity: " + String(fbdo1Humidity));
    Serial.println("Water Level: " + String(fbdo1WaterLevel));
    Serial.println("Pressure: " + String(fbdo1Pressure));
    Serial.println("Battery: " + String(fbdo1Battery));
    Serial.println("Reading ID: " + String(fbdo1ReadingId));
    Serial.println("Timestamp: " + String(fbdo1Timestamp));
    Serial.println("------------------------------------------------");
    Serial.println("Device 2 Latest Reading:");
    Serial.println("Temperature: " + String(fbdo2Temperature));
    Serial.println("Humidity: " + String(fbdo2Humidity));
    Serial.println("Water Level: " + String(fbdo2WaterLevel));
    Serial.println("Pressure: " + String(fbdo2Pressure));
    Serial.println("Battery: " + String(fbdo2Battery));
    Serial.println("Reading ID: " + String(fbdo2ReadingId));
    Serial.println("Timestamp: " + String(fbdo2Timestamp));
    Serial.println("------------------------------------------------");
    Serial.println("Device 3 Latest Reading:");
    Serial.println("Temperature: " + String(fbdo3Temperature));
    Serial.println("Humidity: " + String(fbdo3Humidity));
    Serial.println("Water Level: " + String(fbdo3WaterLevel));
    Serial.println("Pressure: " + String(fbdo3Pressure));
    Serial.println("Battery: " + String(fbdo3Battery));
    Serial.println("Reading ID: " + String(fbdo3ReadingId));
    Serial.println("Timestamp: " + String(fbdo3Timestamp));

    // Clear the JSON document
    if (fbdo1ReadingId > 0 && fbdo1Id == 1) {
      parentPath1 = databasePath + "/" + String(fbdo1Timestamp);
      Serial.print("Board 1 Parent Path: ");
      Serial.println(parentPath1);
      json.clear();
      json.set(idPath.c_str(), String(1.00));
      json.set(tempPath.c_str(), String(fbdo1Temperature));
      json.set(humPath.c_str(), String(fbdo1Humidity));
      json.set(lvlPath.c_str(), String(fbdo1WaterLevel));
      json.set(presPath.c_str(), String(fbdo1Pressure));
      json.set(batPath.c_str(), String(fbdo1Battery));
      json.set(readingIdPath.c_str(), String(fbdo1ReadingId));
      json.set(timePath.c_str(), String(fbdo1Timestamp));
      Serial.println(Firebase.RTDB.setJSON(&fbdo, parentPath1.c_str(), &json));
      Serial.printf("Board 1: Set json... %s\n", Firebase.RTDB.setJSON(&fbdo, parentPath1.c_str(), &json) ? "ok" : fbdo.errorReason().c_str());
    }
    if (fbdo2ReadingId > 0 && fbdo2Id == 2) {
      parentPath2 = databasePath + "/" + String(fbdo2Timestamp);
      Serial.print("Board 2 Parent Path: ");
      Serial.println(parentPath2);
      json.clear();
      json.set(idPath.c_str(), String(2.00));
      json.set(tempPath.c_str(), String(fbdo2Temperature));
      json.set(humPath.c_str(), String(fbdo2Humidity));
      json.set(lvlPath.c_str(), String(fbdo2WaterLevel));
      json.set(presPath.c_str(), String(fbdo2Pressure));
      json.set(batPath.c_str(), String(fbdo2Battery));
      json.set(readingIdPath.c_str(), String(fbdo2ReadingId));
      json.set(timePath.c_str(), String(fbdo2Timestamp));
      Serial.println(Firebase.RTDB.setJSON(&fbdo, parentPath2.c_str(), &json));
      Serial.println("Device 2 Latest Reading:");
      Serial.println("Temperature: " + String(fbdo2Temperature));
      Serial.println("Humidity: " + String(fbdo2Humidity));
      Serial.println("Water Level: " + String(fbdo2WaterLevel));
      Serial.println("Pressure: " + String(fbdo2Pressure));
      Serial.println("Battery: " + String(fbdo2Battery));
      Serial.println("Reading ID: " + String(fbdo2ReadingId));
      Serial.println("Timestamp: " + String(fbdo2Timestamp));
      Serial.println("------------------------------------------------");
      Serial.printf("Board 2: Set json... %s\n", Firebase.RTDB.setJSON(&fbdo, parentPath2.c_str(), &json) ? "ok" : fbdo.errorReason().c_str());
    }
    if (fbdo3ReadingId > 0 && fbdo3Id == 3) {
      parentPath3 = databasePath + "/" + String(fbdo3Timestamp);
      Serial.print("Board 3 Parent Path: ");
      Serial.println(parentPath3);
      json.clear();
      json.set(idPath.c_str(), String(3.00));
      json.set(tempPath.c_str(), String(fbdo3Temperature));
      json.set(humPath.c_str(), String(fbdo3Humidity));
      json.set(lvlPath.c_str(), String(fbdo3WaterLevel));
      json.set(presPath.c_str(), String(fbdo3Pressure));
      json.set(batPath.c_str(), String(fbdo3Battery));
      json.set(readingIdPath.c_str(), String(fbdo3ReadingId));
      json.set(timePath.c_str(), String(fbdo3Timestamp));
      Serial.println(Firebase.RTDB.setJSON(&fbdo, parentPath3.c_str(), &json));
      Serial.println("Device 3 Latest Reading:");
      Serial.println("Temperature: " + String(fbdo3Temperature));
      Serial.println("Humidity: " + String(fbdo3Humidity));
      Serial.println("Water Level: " + String(fbdo3WaterLevel));
      Serial.println("Pressure: " + String(fbdo3Pressure));
      Serial.println("Battery: " + String(fbdo3Battery));
      Serial.println("Reading ID: " + String(fbdo3ReadingId));
      Serial.println("Timestamp: " + String(fbdo3Timestamp));
      Serial.println("------------------------------------------------");
      Serial.printf("Board 3: Set json... %s\n", Firebase.RTDB.setJSON(&fbdo, parentPath3.c_str(), &json) ? "ok" : fbdo.errorReason().c_str());
    }

    if (messageToSend && (fbdo3Pressure >= 23)) {  // Check if there is a message to send
      smsMessage += "Take necessary precautions and ensure your safety!";
      Serial.println(smsMessage);
      sendSMS(smsMessage);
      Serial.println("SMS SENT SUCCESSFULLY");
      lastSMSSent = getCurrentTime();
      lastsmsStatusTracker = smsStatusTracker;
      messageToSend = false;
      // }
    }

    fbSendState = false;
  }

  unsigned long currentVoltageMillis = millis();
  // Check if it's time to take a voltage reading
  if (currentVoltageMillis - previousVoltageMillis >= voltageInterval) {
//calculate voltage
  }
  static uint64_t displayPreviousMillis = 0;
  if (millis() - displayPreviousMillis > 2000) {
    //displays data onscreen
  }
}"