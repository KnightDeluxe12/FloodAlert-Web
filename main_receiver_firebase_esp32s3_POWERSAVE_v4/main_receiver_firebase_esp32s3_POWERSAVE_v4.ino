
// Import required libraries
#include <esp_now.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>
#include <SimpleKalmanFilter.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306_WebServer.h>
#include <SPIFFS.h>
#include <FastLED.h>
#include <HTTPClient.h>
#include <Firebase_ESP_Client.h>
// Provide the token generation process info.
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"
#include "time.h"
#include <esp_sleep.h>

#include <WiFiManager.h>  // https://github.com/tzapu/WiFiManager
RTC_DATA_ATTR int restartAttempts = 0;


#define NUM_LEDS 1
#define LED_BUILTIN 38
void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println("Entered config mode");
  Serial.println(WiFi.softAPIP());
  //if you used auto generated SSID, print it
  Serial.println(myWiFiManager->getConfigPortalSSID());
}

#define uS_TO_S_FACTOR 1000000ULL /* Conversion factor for micro seconds to seconds */
// Define constants
const int RUN_TIME = 10 * 60 * 1000;  // Run time in milliseconds (7 minutes)
const int SLEEP_TIME = 1 * 60;        // Sleep time in milliseconds (3 minutes)

unsigned long currentMillis = millis();
unsigned long interval = 500;             // Minimum time between SMS notifications
static unsigned long previousMillis = 0;  // Previous time an SMS was sent
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
unsigned long fbdopreviousMillis = 0;
const unsigned long fbdodelayInterval = 1000;       // Delay interval in milliseconds
const int analogPin = 19;                           // set analog input pin
const float r1 = 47000.0;                           // set value of resistor 1
const float r2 = 10000.0;                           // set value of resistor 2
const float voltageDividerFactor = (r1 + r2) / r2;  // calculate voltage divider factor
float measuredVoltage;                              // variable to store measured voltage
float filteredVoltage;                              // variable to store filtered voltage
float webVoltage;
const int numReadings = 10;        // Number of readings to average
int voltageReadings[numReadings];  // Array to store the voltage readings
int currentReadingIndex = 0;       // Index of the current voltage reading
unsigned long previousVoltageMillis = 0;
const unsigned long voltageInterval = 100;  // Interval between voltage readings in milliseconds
float previousWaterLevel1;
float previousWaterLevel2;
float previousWaterLevel3;

#define TINY_GSM_MODEM_SIM800
#include <TinyGsmClient.h>
#include <HardwareSerial.h>

#define MODEM_RX 36
#define MODEM_TX 37

#define SMS_RECIPIENT "+639178385080"
String lastSMSSent;
String lastsmsStatusTracker;
String idCheck3;
String idCheck2;
String idCheck1;
String idCheck;
bool messageToSend = false;  // Flag to track if there is a message to sendt

const char *SMS_TARGETS[] = {
  "+639178385080",
  "+639913488194",
  "+639760758324",
  "+639924313528",
  // Add more numbers as needed
};

HardwareSerial SerialAT(1);
TinyGsm modem(SerialAT);


// Replace with your network credentials
const char *ssid = "WIFI_NI_BONJOUR";
const char *password = "BONJD3J3SUSF4M.";
const char *ssid2 = "DonOrigin";
const char *password2 = "10010010";

#define API_KEY "AIzaSyCvh_Wg62d3eBKcTC2H1mmti_WGAA_eRC0"

// Insert Authorized Email and Corresponding Password
#define USER_EMAIL "deluxe12.knight@gmail.com"
#define USER_PASSWORD "09268863966"

// Insert RTDB URLefine the RTDB URL
#define DATABASE_URL "https://the-flood-alert-ph-default-rtdb.asia-southeast1.firebasedatabase.app"

// Define Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Variable to save USER UID
String uid;

// Database main path (to be updated in setup with the user UID)
String databasePath;
// Database child nodes
String idPath = "/boardId";
String tempPath = "/temperature";
String humPath = "/humidity";
String lvlPath = "/waterlevel";
String presPath = "/waterlevelpressure";
String batPath = "/battery";
String readingIdPath = "/readingId";
String timePath = "/timestamp";
String fbdoId;
String fbdoTemp;
String fbdoHum;
String fbdoLvl;
String fbdoPres;
String fbdoBat;
String fbdoReadingId;
// Parent Node (to be updated in every loop)
String parentPath3;
String parentPath1;
String parentPath2;

// Global variables
int fbdo1Id;
float fbdo1Temperature;
float fbdo1Humidity;
float fbdo1WaterLevel;
float fbdo1Pressure;
float fbdo1Battery;
int fbdo1ReadingId;
long fbdo1Timestamp;

int fbdo2Id;
float fbdo2Temperature;
float fbdo2Humidity;
float fbdo2WaterLevel;
float fbdo2Pressure;
float fbdo2Battery;
int fbdo2ReadingId;
long fbdo2Timestamp;

int fbdo3Id;
float fbdo3Temperature;
float fbdo3Humidity;
float fbdo3WaterLevel;
float fbdo3Pressure;
float fbdo3Battery;
int fbdo3ReadingId;
long fbdo3Timestamp;

int timestamp;
FirebaseJson json;

const char *ntpServer = "pool.ntp.org";
bool fbSendState = false;

// Timer variables (send new readings every three minutes)

unsigned long sendDataPrevMillis = 0;
unsigned long timerDelay = 60000;  // 3 minutes
// unsigned long timerDelay = 600000;  // 10 minutes


unsigned long lastDataTimestamp1 = 0;
unsigned long lastDataTimestamp2 = 0;
unsigned long lastDataTimestamp3 = 0;

esp_now_peer_info_t slave;
int chan;

enum MessageType { PAIRING,
                   DATA,
};
MessageType messageType;

int counter = 0;

unsigned long getTime() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    //Serial.println("Failed to obtain time");
    return (0);
  }
  time(&now);
  return now;
}
// Structure example to receive data
// Must match the sender structure
typedef struct struct_message {
  uint8_t msgType;
  uint8_t id;
  float temp;
  float hum;
  float pres;
  float lvl;
  float bat;
  unsigned int readingId;
} struct_message;

typedef struct struct_pairing {  // new structure for pairing
  uint8_t msgType;
  uint8_t id;
  uint8_t macAddr[6];
  uint8_t channel;
} struct_pairing;

struct_message incomingReadings;
struct_message outgoingSetpoints;
struct_pairing pairingData;

void readDataToSend() {
  outgoingSetpoints.msgType = DATA;
  outgoingSetpoints.id = 0;
  outgoingSetpoints.temp = random(0, 40);
  outgoingSetpoints.hum = random(0, 100);
  outgoingSetpoints.lvl = random(0, 100);
  outgoingSetpoints.bat = random(0, 100);
  outgoingSetpoints.pres = random(0, 100);
  outgoingSetpoints.readingId = counter++;
}


// ---------------------------- esp_ now -------------------------
void printMAC(const uint8_t *mac_addr) {
  char macStr[18];
  snprintf(macStr, sizeof(macStr), "%02x:%02x:%02x:%02x:%02x:%02x",
           mac_addr[0], mac_addr[1], mac_addr[2], mac_addr[3], mac_addr[4], mac_addr[5]);
  Serial.print(macStr);
}

bool addPeer(const uint8_t *peer_addr) {  // add pairing
  memset(&slave, 0, sizeof(slave));
  const esp_now_peer_info_t *peer = &slave;
  memcpy(slave.peer_addr, peer_addr, 6);

  slave.channel = chan;  // pick a channel
  slave.encrypt = 0;     // no encryption
  // check if the peer exists
  bool exists = esp_now_is_peer_exist(slave.peer_addr);
  if (exists) {
    // Slave already paired.
    Serial.println("Already Paired");
    return true;
  } else {
    esp_err_t addStatus = esp_now_add_peer(peer);
    if (addStatus == ESP_OK) {
      // Pair success
      Serial.println("Pair success");
      return true;
    } else {
      Serial.println("Pair failed");
      return false;
    }
  }
}

// callback when data is sent
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("Last Packet Send Status: ");
  Serial.print(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success to " : "Delivery Fail to ");
  printMAC(mac_addr);
  Serial.println();
  // Serial.print("fbSendState: ");
  // Serial.println(fbSendState);
  // fbSendState = true;
}

String lastSMSSentTrack() {
  String trackerlastSMSSentTrack = String(lastSMSSent) + "\n" + lastsmsStatusTracker;
  return String(trackerlastSMSSentTrack);
}


void OnDataRecv(const uint8_t *mac_addr, const uint8_t *incomingData, int len) {
  // Serial.print(len);
  // Serial.print(" bytes of data successfully received from : ");
  // printMAC(mac_addr);
  // Serial.println();
  StaticJsonDocument<1000> root;
  String payload;
  uint8_t type = incomingData[0];  // first message byte is the type of message
  switch (type) {
    case DATA:  // the message is data type
      memcpy(&incomingReadings, incomingData, sizeof(incomingReadings));
      // // create a JSON document with received data and send it by event to the web page
      timestamp = getTime();
      root["id"] = incomingReadings.id;
      root["temperature"] = incomingReadings.temp;
      root["humidity"] = incomingReadings.hum;
      root["waterlevel"] = incomingReadings.lvl;
      root["pressure"] = incomingReadings.pres;
      root["battery"] = incomingReadings.bat;
      root["readingId"] = String(incomingReadings.readingId);
      root["timestamp"] = String(timestamp);

      //Store Latest Reading
      if (root["id"] == 1) {
        fbdo1Id = 1;
        fbdo1Timestamp = timestamp;
        idCheck1 = " B1";
      } else if (root["id"] == 2) {
        fbdo2Id = 2;
        fbdo2Timestamp = timestamp;
        idCheck2 = " B2";
      } else if (root["id"] == 3) {
        fbdo3Id = 3;
        fbdo3Timestamp = timestamp;
        idCheck3 = " B3";
      }

      if (root["id"] == fbdo1Id) {
        fbdo1Id = 1;
        fbdo1Temperature = root["temperature"];
        fbdo1Humidity = root["humidity"];
        fbdo1WaterLevel = root["waterlevel"];
        fbdo1Pressure = root["pressure"];
        fbdo1Battery = root["battery"];
        fbdo1ReadingId = root["readingId"];
        fbdo1Timestamp = root["timestamp"];
      } else if (root["id"] == fbdo2Id) {
        fbdo2Id = 2;
        fbdo2Temperature = root["temperature"];
        fbdo2Humidity = root["humidity"];
        fbdo2WaterLevel = root["waterlevel"];
        fbdo2Pressure = root["pressure"];
        fbdo2Battery = root["battery"];
        fbdo2ReadingId = root["readingId"];
        fbdo2Timestamp = root["timestamp"];


      } else if (root["id"] == fbdo3Id) {
        fbdo3Id = 3;
        fbdo3Temperature = root["temperature"];
        fbdo3Humidity = root["humidity"];
        fbdo3WaterLevel = root["waterlevel"];
        fbdo3Pressure = root["pressure"];
        fbdo3Battery = webVoltage;
        fbdo3ReadingId = root["readingId"];
        fbdo3Timestamp = root["timestamp"];
      }
      // Serial.print("event send :");
      // serializeJson(root, Serial);
      fbSendState = true;
      idCheck = idCheck1 + idCheck2 + idCheck3;
      // Serial.print("fbSendState: ");
      // Serial.println(fbSendState);
      break;

    case PAIRING:  // the message is a pairing request
      memcpy(&pairingData, incomingData, sizeof(pairingData));
      Serial.println(pairingData.msgType);
      Serial.println(pairingData.id);
      Serial.print("Pairing request from: ");
      printMAC(mac_addr);
      Serial.println();
      Serial.println(pairingData.channel);
      if (pairingData.id > 0) {  // do not replay to server itself
        if (pairingData.msgType == PAIRING) {
          pairingData.id = 0;  // 0 is server
          // Server is in AP_STA mode: peers need to send data to server soft AP MAC address
          WiFi.softAPmacAddress(pairingData.macAddr);
          pairingData.channel = chan;
          Serial.println("send response");
          esp_err_t result = esp_now_send(mac_addr, (uint8_t *)&pairingData, sizeof(pairingData));
          addPeer(mac_addr);
        }
      }
      break;
  }
}


void initESP_NOW() {
  // Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }
  esp_now_register_send_cb(OnDataSent);
  esp_now_register_recv_cb(OnDataRecv);
}

unsigned long smspreviousMillis = 0;
unsigned long smsInterval = 15000;  // Delay between SMS in milliseconds

void sendSMS(const String &message) {
  modem.sendSMS(SMS_RECIPIENT, message);
  //Send Multiple sms
  //  unsigned long currentMillis = millis();
  //  if (currentMillis - previousMillis >= smsInterval) {
  //    modem.sendSMS(SMS_RECIPIENT, message);
  //    smspreviousMillis = currentMillis;
  //  }
}

String getCurrentTime() {
  HTTPClient http;
  http.begin("http://worldtimeapi.org/api/ip");
  int httpResponseCode = http.GET();

  String currentTime;

  if (httpResponseCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    currentTime = doc["datetime"].as<String>();

    // Extract the date and time components
    int year = currentTime.substring(0, 4).toInt();
    int month = currentTime.substring(5, 7).toInt();
    int day = currentTime.substring(8, 10).toInt();
    int hour = currentTime.substring(11, 13).toInt();
    int minute = currentTime.substring(14, 16).toInt();

    // Format the date and time into the desired format
    currentTime = String(month) + "-" + String(day) + "-" + String(year % 100) + " " + String(hour) + ":" + String(minute);
  }

  http.end();
  return currentTime;
}

void setup() {
  restartAttempts++;
  Serial.begin(115200);
  TinyGsmClient client(modem);
  SerialAT.begin(9600, SERIAL_8N1, MODEM_RX, MODEM_TX);
  // FastLED.addLeds<WS2812B, 38, GRB>(leds, NUM_LEDS);
  // FastLED.setBrightness(10);
  modem.init();
  String modemInfo = modem.getModemInfo();
  Serial.println("Modem Info: " + modemInfo);
  Serial.print("Restart Attempts:  ");
  Serial.println(restartAttempts);
  // Set the device as a Station and Soft Access Point simultaneously
  WiFi.mode(WIFI_AP_STA);
  // Set device as a Wi-Fi Station
  if (restartAttempts > 1) {
    // Proceed to the loop code without connecting to WiFi
    Serial.println("Maximum restart attempts reached. Proceeding without WiFi connection.");
  } else {
    WiFiManager wifiManager;
    // wifiManager.resetSettings();
    wifiManager.setConfigPortalTimeout(60);
    wifiManager.setAPCallback(configModeCallback);
    if (!wifiManager.autoConnect()) {
      Serial.println("failed to connect and hit timeout");
      //reset and try again, or maybe put it to deep sleep
      delay(1000);
      esp_sleep_enable_timer_wakeup(5 * uS_TO_S_FACTOR);

      // Put ESP32 into deep sleep
      esp_deep_sleep_start();
      delay(2000);
    } else {
      // Connected to WiFi, reset the restartAttempts counter
      restartAttempts = 0;
    }
    Serial.println();
    Serial.print("Server MAC Address:  ");
    Serial.println(WiFi.macAddress());
    // leds[1] = CRGB::Green;
    // FastLED.show();
    //if you get here you have connected to the WiFi
    delay(2000);
    // leds[1] = CRGB::Black;
    // FastLED.show();
    Serial.print("Server SOFT AP MAC Address:  ");
    Serial.println(WiFi.softAPmacAddress());

    chan = WiFi.channel();
    Serial.print("Station IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Wi-Fi Channel: ");
    Serial.println(WiFi.channel());
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
    databasePath = "/SensorData/" + uid + "/readings";
  }

  // Update database path

  initESP_NOW();
  delay(2000);
}

void loop() {

  // Run the code for 7 minutes
  unsigned long startTime = millis();
  while (millis() - startTime < RUN_TIME) {
    static unsigned long lastEventTime = millis();
    static const unsigned long EVENT_INTERVAL_MS = 5000;
    if ((millis() - lastEventTime) > EVENT_INTERVAL_MS) {
      lastEventTime = millis();
      readDataToSend();
      esp_now_send(NULL, (uint8_t *)&outgoingSetpoints, sizeof(outgoingSetpoints));
    }
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

      sendDataPrevMillis = millis();
      //Get current timestamp
      timestamp = getTime();
      // unsigned long fbdocurrentMillis = millis();
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
      delay(1000);
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
        Serial.printf("Board 2: Set json... %s\n", Firebase.RTDB.setJSON(&fbdo, parentPath2.c_str(), &json) ? "ok" : fbdo.errorReason().c_str());
      }
      delay(1000);
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
        Serial.printf("Board 3: Set json... %s\n", Firebase.RTDB.setJSON(&fbdo, parentPath3.c_str(), &json) ? "ok" : fbdo.errorReason().c_str());
      }

      if (messageToSend && (fbdo3Pressure >= 23 || fbdo2Pressure >= 23 || fbdo1Pressure >= 23)) {  // Check if there is a message to send
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
      previousVoltageMillis = currentVoltageMillis;

      // Read the analog input
      int rawVoltageValue = analogRead(analogPin);

      // Store the new voltage reading in the array
      voltageReadings[currentReadingIndex] = rawVoltageValue;

      // Move to the next index
      currentReadingIndex++;

      // If the end of the array is reached, wrap around to the beginning
      if (currentReadingIndex >= numReadings) {
        currentReadingIndex = 0;
      }

      // Calculate the average voltage
      float voltageSum = 0;
      for (int i = 0; i < numReadings; i++) {
        voltageSum += voltageReadings[i];
      }
      float averagedVoltageValue = voltageSum / numReadings;

      // Convert the averaged value to voltage
      float measuredVoltage = averagedVoltageValue * (3.3 / 3925.0) * voltageDividerFactor;

      // Calculate the web voltage
      webVoltage = ((measuredVoltage - (3.5 * 3)) / (4.20 * 3 - (3.5 * 3))) * 100;

      // Use the averaged and calculated voltage values as needed
    }
  }

  // Print a message before going to sleep
  Serial.println("Going to sleep...");

  // Configure deep sleep
  esp_sleep_enable_timer_wakeup(SLEEP_TIME * uS_TO_S_FACTOR);

  // Put ESP32 into deep sleep
  esp_deep_sleep_start();
}