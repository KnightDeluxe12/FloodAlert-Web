void task1(void *parameter) {
  for (;;) {

    TempAndHumidity newValues = dht.getTempAndHumidity();

    // Serial.println(" Temperature:" + String(newValues.temperature) + " Humidity:" + String(newValues.humidity));


    float avg_val = 0.0;  // variable for averaging
    for (int ii = 0; ii < avg_size; ii++) {
      avg_val += MPS20N0040D.read();  // add multiple ADC readings
      delay(25);                      // delay between readings
    }
    avg_val /= avg_size;
    float min_value = 8.55e6;  // minimum value of the raw data
    float max_value = 11.2e6;  // maximum value of the raw data
    pressureInCM = (avg_val - min_value) / (max_value - min_value) * 90;

    
      unsigned long currentMillis = millis();
      if (currentMillis - previousMillis >= interval) {
        // Save the last time a new reading was published
        previousMillis = currentMillis;
        //Set values to send
        myData.msgType = DATA;
        myData.id = BOARD_ID;
        myData.temp = float(newValues.temperature);
        myData.hum = float(newValues.humidity);
        myData.pres = pressureInCM;
        myData.lvl = 0.0;
        myData.bat = 0.0;
        myData.readingId = readingId++;
        Serial.print("msgType: ");
        Serial.println(myData.msgType);
        Serial.print("id: ");
        Serial.println(myData.id);
        Serial.print("temp: ");
        Serial.println(myData.temp);
        Serial.print("hum: ");
        Serial.println(myData.hum);
        Serial.print("pres: ");
        Serial.println(myData.pres);
        Serial.print("lvl: ");
        Serial.println(myData.lvl);
        Serial.print("bat: ");
        Serial.println(myData.bat);
        Serial.print("readingId: ");
        Serial.println(myData.readingId);
        esp_err_t result = esp_now_send(serverAddress, (uint8_t *)&myData, sizeof(myData));
      }
    
    vTaskDelay(pdMS_TO_TICKS(1000));  // Delay for 1 second
  }
}

// Task 2
void task2(void *parameter) {
  unsigned long lastOnTime = 0;
  unsigned long lastOffTime = 0;
  unsigned long timeInNPLTV = 0;
  unsigned long timeInNPATV = 0;
  unsigned long offDelayTimeNPLTV = 500;
  unsigned long offDelayTimeNPATV = 500;
  const unsigned long maxOffDelayTime = 60000;  // 1 minute

  for (;;) {
    // Serial.println("Task2 Initialize/Looping");

    int mmdaBoostvalue = 1;
    int nplvValuemin = 23 * mmdaBoostvalue;
    int nplvValuemax = 44 * mmdaBoostvalue;
    int npatvValuemax = 45 * mmdaBoostvalue;
    // Serial.print("Task2 pressureInCM: ");
    // Serial.println(pressureInCM);

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
        lastOffTime = currentPresMillis;
      } else if (!ledState && (currentPresMillis - lastOffTime >= offDelayTimeNPLTV)) {
        // Turn on the LED
        ledState = true;
        for (int i = 0; i < NUM_LEDS; i++) {
          leds[i] = CRGB(255, 0, 30);
        }
        FastLED.show();
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
        lastOffTime = currentPresMillis;
      } else if (!ledState && (currentPresMillis - lastOffTime >= offDelayTimeNPATV)) {
        // Turn on the LED
        ledState = true;
        for (int i = 0; i < NUM_LEDS; i++) {
          leds[i] = CRGB::Red;
        }
        FastLED.show();
        lastOnTime = currentPresMillis;
      }

      timeInNPLTV = 0;          // Reset NPLTV timer
      offDelayTimeNPLTV = 500;  // Reset NPLTV off delay time

    } else {
      for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGB::Black;
      }
      FastLED.show();

      timeInNPLTV = 0;          // Reset NPLTV timer
      offDelayTimeNPLTV = 500;  // Reset NPLTV off delay time

      timeInNPATV = 0;          // Reset NPATV timer
      offDelayTimeNPATV = 500;  // Reset NPATV off delay time
    }

    vTaskDelay(pdMS_TO_TICKS(1000));  // Delay for 1 second
  }
}

void setup() {
  Serial.begin(115200);
  dht.setup(dhtPin, DHTesp::DHT22);
  FastLED.addLeds<WS2811, 12, GRB>(leds, NUM_LEDS).setCorrection(TypicalLEDStrip);
  FastLED.setBrightness(100);
  Serial.println();
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.print("Client Board MAC Address:  ");
  Serial.println(WiFi.macAddress());
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  start = millis();

  xTaskCreatePinnedToCore(task1, "Task1", 2046, NULL, 1, &task1Handle, 0);

  // Create Task 2 on core 1
  xTaskCreatePinnedToCore(task2, "Task2", 2046, NULL, 1, &task2Handle, 1);
}