#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// =====================================================
// WiFi
// =====================================================

const char* ssid = "Dynapro-FTTH";
const char* password = "C00lw@ter1";

// =====================================================
// MQTT
// =====================================================

// MQTT Broker IP
const char* mqtt_server = "192.168.1.39";

// Default MQTT port
const int mqtt_port = 1883;

// If your broker has username/password,
// add them here.
// Leave empty if authentication is not required.

const char* mqtt_user = "";
const char* mqtt_password = "";

WiFiClient espClient;
PubSubClient mqttClient(espClient);


// =====================================================
// PIN DEFINITIONS
// =====================================================

// LEDs
#define LED1 19
#define LED2 21
#define LED3 22

// Servo
#define SERVO_PIN 23

// Existing Sensors
#define FLAME_PIN 4
#define SOUND_PIN 27

#define SOIL_DO 16
#define SOIL_AO 34

// =====================================================
// HC-SR04 ULTRASONIC SENSOR
// =====================================================

#define RAIN_TRIG_PIN 5
#define RAIN_ECHO_PIN 18

// Pump Relay
#define PUMP_RELAY 26


// =====================================================
// SERVO
// =====================================================

Servo servoMotor;


// =====================================================
// VARIABLES
// =====================================================

bool discoMode = false;

bool lastFlame = false;
bool lastSound = false;
bool lastSoil = false;

bool pumpRunning = false;


// =====================================================
// PUMP SETTINGS
// =====================================================

// Pump ON when water reaches this distance
const float PUMP_ON_DISTANCE = 4.5;

// Pump OFF when container is nearly empty
const float PUMP_OFF_DISTANCE = 12.5;


// =====================================================
// TIMING
// =====================================================

unsigned long lastReconnectAttempt = 0;
unsigned long lastSensorUpdate = 0;
unsigned long lastRainUpdate = 0;

const unsigned long reconnectInterval = 5000;


// =====================================================
// RAIN GAUGE SETTINGS
// =====================================================

// Distance from ultrasonic sensor
// to bottom of EMPTY container

const float EMPTY_CONTAINER_DISTANCE_CM = 12.0;

// Storage container diameter
const float CONTAINER_DIAMETER_CM = 14.5;

// Funnel diameter
const float FUNNEL_DIAMETER_CM = 12.5;


// =====================================================
// MQTT TOPICS
// =====================================================

// -------- Commands --------

#define TOPIC_LED1       "iot/led1"
#define TOPIC_LED2       "iot/led2"
#define TOPIC_LED3       "iot/led3"

#define TOPIC_DISCO      "iot/disco"

#define TOPIC_SERVO      "iot/servo"


// -------- Existing Sensor Data --------

#define TOPIC_FIRE       "iot/fire"
#define TOPIC_SOUND      "iot/sound"

#define TOPIC_SOIL_STATUS "iot/soil/status"
#define TOPIC_SOIL_VALUE  "iot/soil/value"


// -------- Rain Gauge --------

// ONLY these three rain parameters are published

#define TOPIC_WATERLEVEL "iot/rain/waterlevel"
#define TOPIC_COLLECTED  "iot/rain/collected"
#define TOPIC_RAINFALL   "iot/rain/rainfall"


// -------- Pump --------

#define TOPIC_PUMP       "iot/pump"


// =====================================================
// MQTT CALLBACK
// Receives commands from MQTT server
// =====================================================

void mqttCallback(char* topic, byte* payload, unsigned int length)
{
    String message = "";

    for (unsigned int i = 0; i < length; i++)
    {
        message += (char)payload[i];
    }

    Serial.println();
    Serial.println("========== MQTT MESSAGE ==========");
    Serial.print("Topic   : ");
    Serial.println(topic);
    Serial.print("Message : ");
    Serial.println(message);
    Serial.println("==================================");


    // =================================================
    // LED 1
    // =================================================

    if (String(topic) == TOPIC_LED1)
    {
        discoMode = false;

        if (message == "ON")
        {
            digitalWrite(LED1, HIGH);
        }

        else if (message == "OFF")
        {
            digitalWrite(LED1, LOW);
        }
    }


    // =================================================
    // LED 2
    // =================================================

    else if (String(topic) == TOPIC_LED2)
    {
        discoMode = false;

        if (message == "ON")
        {
            digitalWrite(LED2, HIGH);
        }

        else if (message == "OFF")
        {
            digitalWrite(LED2, LOW);
        }
    }


    // =================================================
    // LED 3
    // =================================================

    else if (String(topic) == TOPIC_LED3)
    {
        discoMode = false;

        if (message == "ON")
        {
            digitalWrite(LED3, HIGH);
        }

        else if (message == "OFF")
        {
            digitalWrite(LED3, LOW);
        }
    }


    // =================================================
    // DISCO MODE
    // =================================================

    else if (String(topic) == TOPIC_DISCO)
    {
        if (message == "ON")
        {
            discoMode = true;
        }

        else if (message == "OFF")
        {
            discoMode = false;

            digitalWrite(LED1, LOW);
            digitalWrite(LED2, LOW);
            digitalWrite(LED3, LOW);
        }
    }


    // =================================================
    // SERVO
    // =================================================

    else if (String(topic) == TOPIC_SERVO)
    {
        int angle = message.toInt();

        angle = constrain(angle, 0, 180);

        servoMotor.write(angle);

        Serial.print("Servo Angle: ");
        Serial.println(angle);

        // Send confirmation
        if (mqttClient.connected())
        {
            String servoResponse = String(angle);

            mqttClient.publish(
                "iot/servo/status",
                servoResponse.c_str()
            );
        }
    }
}


// =====================================================
// WIFI CONNECTION
// =====================================================

void connectWiFi()
{
    if (WiFi.status() == WL_CONNECTED)
    {
        return;
    }

    Serial.println();
    Serial.print("Connecting to WiFi");

    WiFi.begin(
        ssid,
        password
    );

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);

        Serial.print(".");
    }

    Serial.println();
    Serial.println("WiFi Connected");

    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
}


// =====================================================
// MQTT CONNECTION
// =====================================================

void connectMQTT()
{
    while (!mqttClient.connected())
    {
        Serial.println();
        Serial.println("Connecting to MQTT broker...");

        // Create unique client ID
        String clientID = "ESP32_RAIN_IOT_";

        clientID += String(
            (uint32_t)ESP.getEfuseMac(),
            HEX
        );


        bool connected;


        // =================================================
        // MQTT without username/password
        // =================================================

        if (strlen(mqtt_user) == 0)
        {
            connected = mqttClient.connect(
                clientID.c_str()
            );
        }

        // =================================================
        // MQTT with username/password
        // =================================================

        else
        {
            connected = mqttClient.connect(
                clientID.c_str(),
                mqtt_user,
                mqtt_password
            );
        }


        // =================================================
        // Connected
        // =================================================

        if (connected)
        {
            Serial.println("MQTT Connected");


            // =================================================
            // Subscribe to commands
            // =================================================

            mqttClient.subscribe(TOPIC_LED1);
            mqttClient.subscribe(TOPIC_LED2);
            mqttClient.subscribe(TOPIC_LED3);

            mqttClient.subscribe(TOPIC_DISCO);

            mqttClient.subscribe(TOPIC_SERVO);


            Serial.println("MQTT Topics Subscribed");


            // Online status
            mqttClient.publish(
                "iot/status",
                "ESP32_ONLINE"
            );
        }

        else
        {
            Serial.print("MQTT connection failed, rc=");
            Serial.println(
                mqttClient.state()
            );

            Serial.println(
                "Retrying in 5 seconds..."
            );

            delay(5000);
        }
    }
}


// =====================================================
// SETUP
// =====================================================

void setup()
{
    Serial.begin(115200);


    // =================================================
    // LEDs
    // =================================================

    pinMode(
        LED1,
        OUTPUT
    );

    pinMode(
        LED2,
        OUTPUT
    );

    pinMode(
        LED3,
        OUTPUT
    );


    digitalWrite(LED1, LOW);
    digitalWrite(LED2, LOW);
    digitalWrite(LED3, LOW);


    // =================================================
    // Existing Sensors
    // =================================================

    pinMode(
        FLAME_PIN,
        INPUT
    );

    pinMode(
        SOUND_PIN,
        INPUT
    );

    pinMode(
        SOIL_DO,
        INPUT
    );


    // =================================================
    // HC-SR04
    // =================================================

    pinMode(
        RAIN_TRIG_PIN,
        OUTPUT
    );

    pinMode(
        RAIN_ECHO_PIN,
        INPUT
    );

    digitalWrite(
        RAIN_TRIG_PIN,
        LOW
    );


    // =================================================
    // Pump Relay
    // =================================================

    pinMode(
        PUMP_RELAY,
        OUTPUT
    );

    // Relay OFF
    digitalWrite(
        PUMP_RELAY,
        HIGH
    );


    // =================================================
    // SERVO
    // =================================================

    servoMotor.setPeriodHertz(50);

    servoMotor.attach(
        SERVO_PIN,
        500,
        2500
    );

    servoMotor.write(90);


    // =================================================
    // WIFI
    // =================================================

    WiFi.mode(WIFI_STA);

    connectWiFi();


    // =================================================
    // MQTT
    // =================================================

    mqttClient.setServer(
        mqtt_server,
        mqtt_port
    );

    mqttClient.setCallback(
        mqttCallback
    );

    connectMQTT();


    // =================================================
    // START MESSAGE
    // =================================================

    Serial.println();
    Serial.println(
        "======================================"
    );

    Serial.println(
        "       COMPLETE MQTT IoT SYSTEM"
    );

    Serial.println(
        "======================================"
    );

    Serial.println(
        "HC-SR04 Rain Gauge: READY"
    );

    Serial.println(
        "TRIG: GPIO 5"
    );

    Serial.println(
        "ECHO: GPIO 18"
    );

    Serial.print(
        "MQTT Broker: "
    );

    Serial.println(
        mqtt_server
    );

    Serial.print(
        "MQTT Port: "
    );

    Serial.println(
        mqtt_port
    );

    Serial.println(
        "======================================"
    );
}


// =====================================================
// READ HC-SR04 DISTANCE
// =====================================================

float readRainDistance()
{
    // Trigger LOW
    digitalWrite(
        RAIN_TRIG_PIN,
        LOW
    );

    delayMicroseconds(2);


    // Trigger pulse
    digitalWrite(
        RAIN_TRIG_PIN,
        HIGH
    );

    delayMicroseconds(10);

    digitalWrite(
        RAIN_TRIG_PIN,
        LOW
    );


    // Read echo
    unsigned long duration =
        pulseIn(
            RAIN_ECHO_PIN,
            HIGH,
            60000
        );


    // No echo
    if (duration == 0)
    {
        return -1;
    }


    // Calculate distance
    float distance =
        (
            duration *
            0.0343
        )
        /
        2.0;


    return distance;
}


// =====================================================
// RAIN GAUGE
// ONLY:
// 1. Water Level
// 2. Collected Water
// 3. Rainfall
// =====================================================

void readRainGauge()
{
    float distance =
        readRainDistance();


    // =================================================
    // No Echo
    // =================================================

    if (distance < 0)
    {
        Serial.println(
            "HC-SR04: No Echo"
        );

        return;
    }


    // =================================================
    // WATER LEVEL
    // =================================================

    float waterLevel =
        EMPTY_CONTAINER_DISTANCE_CM
        -
        distance;


    // Prevent negative value
    if (waterLevel < 0)
    {
        waterLevel = 0;
    }


    // =================================================
    // CONTAINER AREA
    // =================================================

    float radius =
        CONTAINER_DIAMETER_CM / 2.0;


    float containerArea =
        3.14159 *
        radius *
        radius;


    // =================================================
    // COLLECTED WATER
    // =================================================

    float collectedWaterML =
        containerArea *
        waterLevel;


    // =================================================
    // FUNNEL AREA
    // =================================================

    float funnelRadius =
        FUNNEL_DIAMETER_CM / 2.0;


    float funnelArea =
        3.14159 *
        funnelRadius *
        funnelRadius;


    // =================================================
    // RAINFALL
    // =================================================

    float rainfallCM =
        collectedWaterML /
        funnelArea;


    float rainfallMM =
        rainfallCM * 10.0;


    // =================================================
    // PUMP CONTROL
    // =================================================

    // Container Full
    if (
        distance <= PUMP_ON_DISTANCE
        &&
        !pumpRunning
    )
    {
        pumpRunning = true;

        digitalWrite(
            PUMP_RELAY,
            LOW
        );

        Serial.println(
            "Pump ON"
        );


        if (mqttClient.connected())
        {
            mqttClient.publish(
                TOPIC_PUMP,
                "ON"
            );
        }
    }


    // Container Empty
    if (
        distance >= PUMP_OFF_DISTANCE
        &&
        pumpRunning
    )
    {
        pumpRunning = false;

        digitalWrite(
            PUMP_RELAY,
            HIGH
        );

        Serial.println(
            "Pump OFF"
        );


        if (mqttClient.connected())
        {
            mqttClient.publish(
                TOPIC_PUMP,
                "OFF"
            );
        }
    }


    // =================================================
    // SERIAL MONITOR
    // =================================================

    Serial.println();
    Serial.println(
        "========== RAIN GAUGE =========="
    );


    Serial.print(
        "Water Level: "
    );

    Serial.print(
        waterLevel,
        2
    );

    Serial.println(
        " cm"
    );


    Serial.print(
        "Collected Water: "
    );

    Serial.print(
        collectedWaterML,
        2
    );

    Serial.println(
        " mL"
    );


    Serial.print(
        "Rainfall: "
    );

    Serial.print(
        rainfallMM,
        2
    );

    Serial.println(
        " mm"
    );


    Serial.println(
        "================================"
    );


    // =================================================
    // SEND ONLY 3 RAIN PARAMETERS THROUGH MQTT
    // =================================================

    if (mqttClient.connected())
    {
        String waterLevelString =
            String(
                waterLevel,
                2
            );

        String collectedString =
            String(
                collectedWaterML,
                2
            );

        String rainfallString =
            String(
                rainfallMM,
                2
            );


        mqttClient.publish(
            TOPIC_WATERLEVEL,
            waterLevelString.c_str()
        );


        mqttClient.publish(
            TOPIC_COLLECTED,
            collectedString.c_str()
        );


        mqttClient.publish(
            TOPIC_RAINFALL,
            rainfallString.c_str()
        );
    }
}


// =====================================================
// EXISTING SENSOR READING
// =====================================================

void readSensors()
{
    bool flame =
        digitalRead(
            FLAME_PIN
        )
        ==
        LOW;


    bool sound =
        digitalRead(
            SOUND_PIN
        )
        ==
        LOW;


    bool soil =
        digitalRead(
            SOIL_DO
        )
        ==
        LOW;


    int moisture =
        analogRead(
            SOIL_AO
        );


    // =================================================
    // FLAME
    // =================================================

    if (flame != lastFlame)
    {
        lastFlame = flame;


        if (mqttClient.connected())
        {
            mqttClient.publish(
                TOPIC_FIRE,
                flame
                ?
                "ON"
                :
                "OFF"
            );
        }
    }


    // =================================================
    // SOUND
    // =================================================

    if (sound != lastSound)
    {
        lastSound = sound;


        if (mqttClient.connected())
        {
            mqttClient.publish(
                TOPIC_SOUND,
                sound
                ?
                "ON"
                :
                "OFF"
            );
        }
    }


    // =================================================
    // SOIL DIGITAL
    // =================================================

    if (soil != lastSoil)
    {
        lastSoil = soil;


        if (mqttClient.connected())
        {
            mqttClient.publish(
                TOPIC_SOIL_STATUS,
                soil
                ?
                "WET"
                :
                "DRY"
            );
        }
    }


    // =================================================
    // SOIL ANALOG
    // =================================================

    if (mqttClient.connected())
    {
        String moistureString =
            String(moisture);


        mqttClient.publish(
            TOPIC_SOIL_VALUE,
            moistureString.c_str()
        );
    }
}


// =====================================================
// DISCO MODE
// =====================================================

void runDisco()
{
    static byte step = 0;

    static unsigned long timer = 0;


    if (
        millis()
        -
        timer
        <
        120
    )
    {
        return;
    }


    timer = millis();


    digitalWrite(
        LED1,
        LOW
    );

    digitalWrite(
        LED2,
        LOW
    );

    digitalWrite(
        LED3,
        LOW
    );


    switch (step)
    {
        case 0:

            digitalWrite(
                LED1,
                HIGH
            );

            break;


        case 1:

            digitalWrite(
                LED2,
                HIGH
            );

            break;


        case 2:

            digitalWrite(
                LED3,
                HIGH
            );

            break;
    }


    step++;


    if (step > 2)
    {
        step = 0;
    }
}


// =====================================================
// MAIN LOOP
// =====================================================

void loop()
{
    // =================================================
    // WIFI
    // =================================================

    if (
        WiFi.status()
        !=
        WL_CONNECTED
    )
    {
        connectWiFi();
    }


    // =================================================
    // MQTT
    // =================================================

    if (
        WiFi.status()
        ==
        WL_CONNECTED
        &&
        !mqttClient.connected()
    )
    {
        if (
            millis()
            -
            lastReconnectAttempt
            >
            reconnectInterval
        )
        {
            lastReconnectAttempt =
                millis();

            connectMQTT();
        }
    }


    // =================================================
    // MQTT LOOP
    // =================================================

    if (mqttClient.connected())
    {
        mqttClient.loop();
    }


    // =================================================
    // DISCO MODE
    // =================================================

    if (discoMode)
    {
        runDisco();
    }


    // =================================================
    // EXISTING SENSORS
    // =================================================

    if (
        millis()
        -
        lastSensorUpdate
        >
        500
    )
    {
        lastSensorUpdate =
            millis();

        readSensors();
    }


    // =================================================
    // RAIN GAUGE
    // =================================================

    if (
        millis()
        -
        lastRainUpdate
        >
        2000
    )
    {
        lastRainUpdate =
            millis();

        readRainGauge();
    }
}