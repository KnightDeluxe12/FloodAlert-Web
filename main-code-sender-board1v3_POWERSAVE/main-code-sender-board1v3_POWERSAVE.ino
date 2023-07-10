
// ██████╗░░█████╗░░█████╗░██████╗░██████╗░  ░░███╗░░
// ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗  ░████║░░
// ██████╦╝██║░░██║███████║██████╔╝██║░░██║  ██╔██║░░
// ██╔══██╗██║░░██║██╔══██║██╔══██╗██║░░██║  ╚═╝██║░░
// ██████╦╝╚█████╔╝██║░░██║██║░░██║██████╔╝  ███████╗
// ╚═════╝░░╚════╝░╚═╝░░╚═╝╚═╝░░╚═╝╚═════╝░  ╚══════╝

#include <Arduino.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <WiFi.h>
#include <EEPROM.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include "DHTesp.h"
// #include <esp_sleep.h>
// #define uS_TO_S_FACTOR 1000000ULL /* Conversion factor for micro seconds to seconds */
// // Define constants
// const int RUN_TIME = 5 * 60 * 1000;  // Run time in milliseconds (5 minutes)
// const int SLEEP_TIME = 1 * 60;       // Sleep time in milliseconds (5 minutes)
//FastLED
#include <FastLED.h>
#define NUM_LEDS 32
#define LED_BUILTIN 12
const int buzzerPin = 14;

CRGB leds[NUM_LEDS];

#include <Q2HX711.h>

//Humidity

bool getTemperature();
int dhtPin = 4;
DHTesp dht;
const byte MPS_OUT_pin = 5;   // OUT data pin
const byte MPS_SCK_pin = 18;  // clock data pin
int avg_size = 5;             // #pts to average over
Q2HX711 MPS20N0040D(MPS_OUT_pin, MPS_SCK_pin);

// //Ultrasonic
// #include <NewPing.h>
// #define TRIGGER_PIN 2
// #define ECHO_PIN 15
// #define MAX_DISTANCE 400
// NewPing sonar(TRIGGER_PIN, ECHO_PIN, MAX_DISTANCE);

const int analogPin = 35;  // set analog input pin
//board 1&2
const float r1 = 24000.0;  // set value of resistor 1
const float r2 = 47000.0;  // set value of resistor 2

const float voltageDividerFactor = (r1 + r2) / r2;  // calculate voltage divider factor
float measuredVoltage;
float filteredVoltage;

// Set your Board and Server ID
#define BOARD_ID 1
#define MAX_CHANNEL 11  // for North America // 13 in Europe

uint8_t serverAddress[] = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF };

//Structure to send data
//Must match the receiver structure
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

//Create 2 struct_message
struct_message myData;  // data to send
struct_message inData;  // data received
struct_pairing pairingData;

enum PairingStatus { NOT_PAIRED,
                     PAIR_REQUEST,
                     PAIR_REQUESTED,
                     PAIR_PAIRED,
};
PairingStatus pairingStatus = NOT_PAIRED;

enum MessageType { PAIRING,
                   DATA,
};
MessageType messageType;

#ifdef SAVE_CHANNEL
int lastChannel;
#endif
int channel = 1;

// simulate temperature and humidity data
float t = 0;
float h = 0;
float p = 0;
float w = 0;
float b = 0;

unsigned long currentMillis = millis();
unsigned long previousMillis = 0;  // Stores last time temperature was published
const long interval = 250;         // Interval at which to publish sensor readings
unsigned long start;               // used to measure Pairing time
unsigned int readingId = 0;
bool ledState = false;
float pressureInCM = 0.0;
unsigned long lastOnTime = 0;
unsigned long lastOffTime = 0;
unsigned long timeInNPLTV = 0;
unsigned long timeInNPATV = 0;
unsigned long offDelayTimeNPLTV = 500;
unsigned long offDelayTimeNPATV = 500;
const unsigned long maxOffDelayTime = 60000;  // 1 minute


// simulate temperature reading
float readBATLevel() {
  b = random(0, 100);
  return b;
}

float readDHTTemperature() {
  t = random(0, 100);
  return t;
}

// simulate humidity reading
float readDHTHumidity() {
  h = random(0, 100);
  return h;
}

// simulate water level reading
float readDHTLevel() {
  w = random(0, 100);
  return w;
}

// simulate pressure reading
float readDHTTPressure() {
  p = random(0, 100);
  return p;
}

void addPeer(const uint8_t *mac_addr, uint8_t chan) {
  esp_now_peer_info_t peer;
  ESP_ERROR_CHECK(esp_wifi_set_channel(chan, WIFI_SECOND_CHAN_NONE));
  esp_now_del_peer(mac_addr);
  memset(&peer, 0, sizeof(esp_now_peer_info_t));
  peer.channel = chan;
  peer.encrypt = false;
  memcpy(peer.peer_addr, mac_addr, sizeof(uint8_t[6]));
  if (esp_now_add_peer(&peer) != ESP_OK) {
    Serial.println("Failed to add peer");
    return;
  }
  memcpy(serverAddress, mac_addr, sizeof(uint8_t[6]));
}

void printMAC(const uint8_t *mac_addr) {
  char macStr[18];
  snprintf(macStr, sizeof(macStr), "%02x:%02x:%02x:%02x:%02x:%02x",
           mac_addr[0], mac_addr[1], mac_addr[2], mac_addr[3], mac_addr[4], mac_addr[5]);
  Serial.print(macStr);
}

void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("\r\nLast Packet Send Status:\t");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
}

void OnDataRecv(const uint8_t *mac_addr, const uint8_t *incomingData, int len) {
  Serial.print("Packet received from: ");
  printMAC(mac_addr);
  Serial.println();
  Serial.print("data size = ");
  Serial.println(sizeof(incomingData));
  uint8_t type = incomingData[0];
  switch (type) {
    case DATA:  // we received data from server
      memcpy(&inData, incomingData, sizeof(inData));
      // Serial.print("ID  = ");
      // Serial.println(inData.id);
      // Serial.print("Setpoint temperature = ");
      // Serial.println(inData.temp);
      // Serial.print("Setpoint humidity = ");
      // Serial.println(inData.hum);
      // Serial.print("Setpoint pressure = ");
      // Serial.println(inData.pres);
      // Serial.print("Setpoint water level = ");
      // Serial.println(inData.lvl);
      // Serial.print("Setpoint battery level = ");
      // Serial.println(inData.bat);
      // Serial.print("reading Id  = ");
      // Serial.println(inData.readingId);

      // if (inData.readingId % 2 == 1) {
      //   digitalWrite(LED_BUILTIN, LOW);
      // } else {
      //   digitalWrite(LED_BUILTIN, HIGH);
      // }
      break;

    case PAIRING:  // we received pairing data from server
      memcpy(&pairingData, incomingData, sizeof(pairingData));
      if (pairingData.id == 0) {  // the message comes from server
        printMAC(mac_addr);
        Serial.print("Pairing done for ");
        printMAC(pairingData.macAddr);
        Serial.print(" on channel ");
        Serial.print(pairingData.channel);  // channel used by the server
        Serial.print(" in ");
        Serial.print(millis() - start);
        Serial.println("ms");
        addPeer(pairingData.macAddr, pairingData.channel);  // add the server  to the peer list
#ifdef SAVE_CHANNEL
        lastChannel = pairingData.channel;
        EEPROM.write(0, pairingData.channel);
        EEPROM.commit();
#endif
        pairingStatus = PAIR_PAIRED;  // set the pairing status
      }
      break;
  }
}

PairingStatus autoPairing() {
  switch (pairingStatus) {
    case PAIR_REQUEST:
      Serial.print("Pairing request on channel ");
      Serial.println(channel);

      // set WiFi channel
      ESP_ERROR_CHECK(esp_wifi_set_channel(channel, WIFI_SECOND_CHAN_NONE));
      if (esp_now_init() != ESP_OK) {
        Serial.println("Error initializing ESP-NOW");
      }

      // set callback routines
      esp_now_register_send_cb(OnDataSent);
      esp_now_register_recv_cb(OnDataRecv);

      // set pairing data to send to the server
      pairingData.msgType = PAIRING;
      pairingData.id = BOARD_ID;
      pairingData.channel = channel;

      // add peer and send request
      addPeer(serverAddress, channel);
      esp_now_send(serverAddress, (uint8_t *)&pairingData, sizeof(pairingData));
      previousMillis = millis();
      pairingStatus = PAIR_REQUESTED;
      break;

    case PAIR_REQUESTED:
      // time out to allow receiving response from server
      currentMillis = millis();
      if (currentMillis - previousMillis > 250) {
        previousMillis = currentMillis;
        // time out expired,  try next channel
        channel++;
        if (channel > MAX_CHANNEL) {
          channel = 1;
        }
        pairingStatus = PAIR_REQUEST;
      }
      break;

    case PAIR_PAIRED:
      // nothing to do here
      break;
  }
  return pairingStatus;
}

void setup() {
  Serial.begin(115200);
  dht.setup(dhtPin, DHTesp::DHT22);
  FastLED.addLeds<WS2812B, 12, GRB>(leds, NUM_LEDS);
  pinMode(buzzerPin, OUTPUT);
  FastLED.setBrightness(100);
  Serial.println();
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.print("Client Board MAC Address:  ");
  Serial.println(WiFi.macAddress());
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  start = millis();


#ifdef SAVE_CHANNEL
  EEPROM.begin(10);
  lastChannel = EEPROM.read(0);
  Serial.println(lastChannel);
  html if (lastChannel >= 1 && lastChannel <= MAX_CHANNEL) {
    channel = lastChannel;
  }
  Serial.println(channel);
#endif
  pairingStatus = PAIR_REQUEST;
}

void loop() {
  // unsigned long startTime = millis();
  // while (millis() - startTime < RUN_TIME) {
    TempAndHumidity newValues = dht.getTempAndHumidity();

    float avg_val = 0.0;  // variable for averaging
    for (int ii = 0; ii < avg_size; ii++) {
      avg_val += MPS20N0040D.read();  // add multiple ADC readings
      delay(25);                      // delay between readings
    }
    avg_val /= avg_size;
    float min_value = 8.6e6;   // minimum value of the raw data higher means low value vice versa
    float max_value = 11.7e6;  // maximum value of the raw data
    float calibrationFactor = 10.1;

    float pressure = ((avg_val - min_value) / (max_value - min_value) * 1000) * calibrationFactor;
    float pressureInCM = pressure / (1000.0 * 1.0 * 9.80665);  // result is in meters
    pressureInCM = pressureInCM * 100;                         // convert to centimeters
    if (pressureInCM >= -10 && pressureInCM <= 1) {            //board 2: 4 and 4.5
      pressureInCM = 0;
    } else if (pressureInCM >= 1.5) {
      pressureInCM = pressureInCM;
    }

    if (pressureInCM > 89) {
      pressureInCM = 90;
    }
    // Serial.println(pressureInCM, 0);

    int mmdaBoostvalue = 1;
    int nplvValuemin = 23 * mmdaBoostvalue;
    int nplvValuemax = 44 * mmdaBoostvalue;
    int npatvValuemax = 45 * mmdaBoostvalue;
    // Serial.print("Water Level: ");
    // Serial.println(pressureInCM, 0);
    unsigned long currentPresMillis = millis();  // Get the current time

    if (pressureInCM >= nplvValuemin && pressureInCM < nplvValuemax) {
      Serial.println("NPLTV Triggered!");

      if (timeInNPLTV == 0) {
        timeInNPLTV = currentPresMillis;
      } else if (currentPresMillis - timeInNPLTV > 10000) {
        if (currentPresMillis - timeInNPLTV > (offDelayTimeNPLTV + 30000)) {
          offDelayTimeNPLTV += 1000;
          if (offDelayTimeNPLTV > maxOffDelayTime) {
            offDelayTimeNPLTV = maxOffDelayTime;
          }
          timeInNPLTV = currentPresMillis;
        }
      }

      if (ledState && (currentPresMillis - lastOnTime >= 500)) {
        // Turn off the LED
        ledState = false;
        for (int i = 0; i < NUM_LEDS; i++) {
          leds[i] = CRGB::Black;
        }
        FastLED.show();
        digitalWrite(buzzerPin, LOW);
        lastOffTime = currentPresMillis;
      } else if (!ledState && (currentPresMillis - lastOffTime >= offDelayTimeNPLTV)) {
        // Turn on the LED
        ledState = true;
        for (int i = 0; i < NUM_LEDS; i++) {
          leds[i] = CRGB(255, 30, 0);
        }
        FastLED.show();
        digitalWrite(buzzerPin, HIGH);
        lastOnTime = currentPresMillis;
      }

      timeInNPATV = 0;          // Reset NPATV timer
      offDelayTimeNPATV = 500;  // Reset NPATV off delay time

    } else if (pressureInCM >= npatvValuemax && pressureInCM < 200) {
      Serial.println("NPATV Triggered!");

      if (timeInNPATV == 0) {
        timeInNPATV = currentPresMillis;
      } else if (currentPresMillis - timeInNPATV > 10000) {
        if (currentPresMillis - timeInNPATV > (offDelayTimeNPATV + 30000)) {
          offDelayTimeNPATV += 1000;
          if (offDelayTimeNPATV > maxOffDelayTime) {
            offDelayTimeNPATV = maxOffDelayTime;
          }
          timeInNPATV = currentPresMillis;
        }
      }

      if (ledState && (currentPresMillis - lastOnTime >= 500)) {
        // Turn off the LED
        ledState = false;
        for (int i = 0; i < NUM_LEDS; i++) {
          leds[i] = CRGB::Black;
        }
        FastLED.show();
        digitalWrite(buzzerPin, LOW);
        lastOffTime = currentPresMillis;
      } else if (!ledState && (currentPresMillis - lastOffTime >= offDelayTimeNPATV)) {
        // Turn on the LED
        ledState = true;
        for (int i = 0; i < NUM_LEDS; i++) {
          leds[i] = CRGB::Red;
        }
        FastLED.show();
        digitalWrite(buzzerPin, HIGH);
        lastOnTime = currentPresMillis;
      }

      timeInNPLTV = 0;          // Reset NPLTV timer
      offDelayTimeNPLTV = 500;  // Reset NPLTV off delay time

    } else {
      for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGB::Black;
      }
      FastLED.show();
      digitalWrite(buzzerPin, LOW);
      timeInNPLTV = 0;          // Reset NPLTV timer
      offDelayTimeNPLTV = 500;  // Reset NPLTV off delay time

      timeInNPATV = 0;          // Reset NPATV timer
      offDelayTimeNPATV = 500;  // Reset NPATV off delay time
    }

    float measuredVoltage = analogRead(analogPin) * (3.3 / 3735.0) * voltageDividerFactor;
    float filteredVoltage = ((measuredVoltage - (3.3)) / (4.20 - (3.3))) * 100;
    // Serial.print("measuredVoltage = ");
    // Serial.println(measuredVoltage);
    // Serial.print("filteredVoltage = ");
    // Serial.println(filteredVoltage);


    if (autoPairing() == PAIR_PAIRED) {
      unsigned long currentMillis = millis();
      if (currentMillis - previousMillis >= interval) {
        // Save the last time a new reading was published
        previousMillis = currentMillis;
        //Set values to send
        myData.msgType = DATA;
        myData.id = BOARD_ID;
        myData.temp = float(newValues.temperature);
        myData.hum = float(newValues.humidity);
        myData.pres = float(pressureInCM);
        myData.lvl = 0.0;
        myData.bat = float(filteredVoltage);
        myData.readingId = readingId++;
        // Serial.print("myData.msgType = ");
        // Serial.println(myData.msgType);
        // Serial.print("myData.id = ");
        // Serial.println(myData.id);
        // Serial.print("myData.temp = ");
        // Serial.println(myData.temp);
        // Serial.print("myData.hum = ");
        // Serial.println(myData.hum);
        // Serial.print("myData.pres = ");
        // Serial.println(myData.pres);
        // Serial.print("myData.lvl = ");
        // Serial.println(myData.lvl);
        // Serial.print("myData.bat = ");
        // Serial.println(myData.bat);
        // Serial.print("myData.readingId = ");
        // Serial.println(myData.readingId);
        // Serial.println("--------------------------------");
        esp_err_t result = esp_now_send(serverAddress, (uint8_t *)&myData, sizeof(myData));
      }
    }
  // }
  // // Print a message before going to sleep
  // Serial.println("Going to sleep...");

  // // Configure deep sleep
  // esp_sleep_enable_timer_wakeup(SLEEP_TIME * uS_TO_S_FACTOR);

  // // Put ESP32 into deep sleep
  // esp_deep_sleep_start();
}