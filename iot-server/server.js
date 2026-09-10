require("dotenv").config();

const express = require("express");
const WebSocket = require("ws");
const path = require("path");
const mysql = require("mysql2");
const mqtt = require("mqtt");

// ================================================================
// CONFIGURATION
// ================================================================

const app = express();

const PORT = Number(process.env.PORT || 5005);

const MQTT_URL =
    process.env.MQTT_URL || "mqtt://localhost:1883";

const MQTT_CLIENT_ID =
    process.env.MQTT_CLIENT_ID || "iot-server-local";

const DEVICE_ID =
    process.env.DEVICE_ID || "ESP32-01";

const OFFLINE_AFTER_MS =
    Number(process.env.OFFLINE_AFTER_MS || 15000);

const CONTAINER_CAPACITY_ML =
    Number(process.env.CONTAINER_CAPACITY_ML || 2000);

// ================================================================
// MYSQL CONNECTION
// ================================================================

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "phpuser",
    password: process.env.DB_PASS || "phpuser",
    database: process.env.DB_NAME || "iot_dashboard",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Check database connection
db.getConnection((err, connection) => {
    if (err) {
        console.error(
            `[MYSQL] Connection failed: ${err.message}`
        );
        return;
    }

    console.log("[MYSQL] Connected successfully");
    connection.release();
});

// ================================================================
// EXPRESS
// ================================================================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ================================================================
// DEVICE STATE
// ================================================================

const state = {
    deviceId: DEVICE_ID,

    connected: false,
    lastSeen: 0,

    flame: false,

    sound: false,

    soilWet: false,
    soilValue: 0,

    rainDistance: null,
    waterLevel: null,

    rainVolume: null,
    collectedWater: null,

    rainfallMM: null,

    funnelDiameter: null,

    pumpRunning: false,

    servoAngle: 90,

    detectionCount: 0,
    lastDetection: null
};

// ================================================================
// INTERNAL VARIABLES
// ================================================================

let lastLoggedSnapshot = null;

let lastSoilSaveTime = 0;
let lastRainSaveTime = 0;

const SOIL_DELTA = 30;

const RAIN_LEVEL_DELTA = 0.3;

const ANALOG_MIN_INTERVAL_MS = 5000;

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

function timestamp() {
    return new Date().toLocaleTimeString();
}

function markDeviceOnline() {
    state.connected = true;
    state.lastSeen = Date.now();
}

function getPublicState() {
    return {
        ...state,
        containerCapacityML: CONTAINER_CAPACITY_ML
    };
}

// ================================================================
// WEB SOCKET SERVER
// Browser <-> IoT Server
// ================================================================

const server = app.listen(PORT, () => {
    console.log("");
    console.log("==========================================");
    console.log("        IoT SERVER STARTED");
    console.log("==========================================");
    console.log(
        `[${timestamp()}] HTTP      : http://184.168.27.107:${PORT}`
    );
    console.log(
        `[${timestamp()}] MQTT      : ${MQTT_URL}`
    );
    console.log(
        `[${timestamp()}] DEVICE ID : ${DEVICE_ID}`
    );
    console.log("==========================================");
    console.log("");
});

const wss = new WebSocket.Server({
    server
});

// ---------------------------------------------------------------
// Send message to one WebSocket client
// ---------------------------------------------------------------

function sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

// ---------------------------------------------------------------
// Broadcast device list
// ---------------------------------------------------------------

function broadcastDevices() {
    const message = {
        type: "devices",
        devices: [DEVICE_ID]
    };

    wss.clients.forEach(client => {
        sendToClient(client, message);
    });
}

// ---------------------------------------------------------------
// Broadcast complete device state
// ---------------------------------------------------------------

function broadcastState() {
    const message = {
        type: "state",
        device: getPublicState()
    };

    wss.clients.forEach(client => {
        sendToClient(client, message);
    });
}

// ---------------------------------------------------------------
// WebSocket connection
// ---------------------------------------------------------------

wss.on("connection", ws => {

    console.log(
        `[${timestamp()}] Browser WebSocket connected`
    );

    // Send devices immediately
    sendToClient(ws, {
        type: "devices",
        devices: [DEVICE_ID]
    });

    // Send current state
    sendToClient(ws, {
        type: "state",
        device: getPublicState()
    });

    ws.on("close", () => {
        console.log(
            `[${timestamp()}] Browser WebSocket disconnected`
        );
    });

    ws.on("error", err => {
        console.error(
            `[${timestamp()}] WebSocket error: ${err.message}`
        );
    });
});

// ================================================================
// DATABASE LOGGING
// ================================================================

function saveSensorLog(reason) {

    const sql = `
        INSERT INTO sensor_logs
        (
            device_id,
            flame_status,
            sound_status,
            soil_status,
            servo_angle,
            water_level,
            rain_volume_ml,
            rainfall_mm,
            pump_running
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        state.deviceId,

        state.flame,

        state.sound,

        state.soilWet,

        state.servoAngle,

        state.waterLevel,

        state.rainVolume,

        state.rainfallMM,

        state.pumpRunning
    ];

    db.query(sql, values, err => {

        if (err) {

            console.error(
                `[${timestamp()}] MySQL INSERT ERROR: ${err.message}`
            );

            return;
        }

        console.log(
            `[${timestamp()}] DB LOG: ${reason}`
        );

        lastLoggedSnapshot = {
            soilValue: state.soilValue,
            waterLevel: state.waterLevel
        };
    });
}

// ================================================================
// SOIL ANALOG LOGGING
// ================================================================

function logSoilValueIfRequired() {

    const now = Date.now();

    const previousValue =
        lastLoggedSnapshot &&
            Number.isFinite(lastLoggedSnapshot.soilValue)
            ? lastLoggedSnapshot.soilValue
            : null;

    const valueChanged =
        previousValue === null ||
        Math.abs(
            state.soilValue - previousValue
        ) >= SOIL_DELTA;

    const enoughTimePassed =
        now - lastSoilSaveTime >=
        ANALOG_MIN_INTERVAL_MS;

    if (
        valueChanged &&
        enoughTimePassed
    ) {

        lastSoilSaveTime = now;

        saveSensorLog(
            "soil analog value"
        );
    }
}

// ================================================================
// RAIN GAUGE LOGGING
// ================================================================

function logRainValueIfRequired() {

    const now = Date.now();

    const previousLevel =
        lastLoggedSnapshot &&
            Number.isFinite(lastLoggedSnapshot.waterLevel)
            ? lastLoggedSnapshot.waterLevel
            : null;

    const currentLevel =
        Number.isFinite(state.waterLevel)
            ? state.waterLevel
            : 0;

    const valueChanged =
        previousLevel === null ||
        Math.abs(
            currentLevel - previousLevel
        ) >= RAIN_LEVEL_DELTA;

    const enoughTimePassed =
        now - lastRainSaveTime >=
        ANALOG_MIN_INTERVAL_MS;

    if (
        valueChanged &&
        enoughTimePassed
    ) {

        lastRainSaveTime = now;

        saveSensorLog(
            "rain gauge"
        );
    }
}

// ================================================================
// MQTT CLIENT
// ESP32 <-> MQTT BROKER <-> SERVER
// ================================================================

const mqttOptions = {

    clientId: MQTT_CLIENT_ID,

    clean: true,

    reconnectPeriod: 2000,

    connectTimeout: 10000
};

// MQTT username/password only if configured
if (process.env.MQTT_USER) {
    mqttOptions.username =
        process.env.MQTT_USER;
}

if (process.env.MQTT_PASS) {
    mqttOptions.password =
        process.env.MQTT_PASS;
}

console.log(
    `[${timestamp()}] Connecting to MQTT: ${MQTT_URL}`
);

const mqttClient = mqtt.connect(
    MQTT_URL,
    mqttOptions
);

// ================================================================
// MQTT CONNECT
// ================================================================

mqttClient.on("connect", () => {

    console.log(
        `[${timestamp()}] MQTT CONNECTED`
    );

    console.log(
        `[${timestamp()}] Subscribing to iot/#`
    );

    mqttClient.subscribe(
        "iot/#",
        { qos: 0 },
        err => {

            if (err) {

                console.error(
                    `[${timestamp()}] MQTT SUBSCRIBE ERROR: ${err.message}`
                );

                return;
            }

            console.log(
                `[${timestamp()}] MQTT SUBSCRIBED: iot/#`
            );

            broadcastDevices();
        }
    );
});

// ================================================================
// MQTT RECONNECT
// ================================================================

// mqttClient.on("reconnect", () => {

//     console.log(
//         `[${timestamp()}] MQTT reconnecting...`
//     );
// });

// ================================================================
// MQTT OFFLINE
// ================================================================

mqttClient.on("offline", () => {

    console.log(
        `[${timestamp()}] MQTT client offline`
    );
});

// ================================================================
// MQTT ERROR
// ================================================================

// mqttClient.on("error", err => {

//     console.error(
//         `[${timestamp()}] MQTT ERROR: ${err.message}`
//     );
// });

// ================================================================
// MQTT MESSAGE RECEIVER
// ================================================================

mqttClient.on(
    "message",
    (topic, payloadBuffer) => {

        const payload =
            payloadBuffer
                .toString()
                .trim();

        console.log(
            `[${timestamp()}] MQTT <- ${topic} = ${payload}`
        );

        // ----------------------------------------------------------
        // ESP32 STATUS
        // Topic: iot/status
        // Payload: ESP32_ONLINE
        // ----------------------------------------------------------

        if (topic === "iot/status") {

            if (
                payload === "ESP32_ONLINE" ||
                payload === "ONLINE"
            ) {

                markDeviceOnline();

                broadcastState();
            }

            return;
        }

        // ----------------------------------------------------------
        // FLAME SENSOR
        // Topic: iot/fire
        // ON / OFF
        // ----------------------------------------------------------

        if (topic === "iot/fire") {

            const flame =
                payload.toUpperCase() === "ON";

            if (
                flame &&
                !state.flame
            ) {

                state.detectionCount++;

                state.lastDetection =
                    new Date().toLocaleString();
            }

            if (
                flame !==
                state.flame
            ) {

                state.flame = flame;

                markDeviceOnline();

                saveSensorLog("flame");
            }
            else {

                markDeviceOnline();
            }

            broadcastState();

            return;
        }

        // ----------------------------------------------------------
        // SOUND SENSOR
        // Topic: iot/sound
        // ON / OFF
        // ----------------------------------------------------------

        if (topic === "iot/sound") {

            const sound =
                payload.toUpperCase() === "ON";

            if (
                sound !==
                state.sound
            ) {

                state.sound = sound;

                markDeviceOnline();

                saveSensorLog("sound");
            }
            else {

                markDeviceOnline();
            }

            broadcastState();

            return;
        }

        // ----------------------------------------------------------
        // SOIL DIGITAL STATUS
        // Topic: iot/soil/status
        // WET / DRY
        // ----------------------------------------------------------

        if (topic === "iot/soil/status") {

            const soilWet =
                payload.toUpperCase() === "WET";

            if (
                soilWet !==
                state.soilWet
            ) {

                state.soilWet = soilWet;

                markDeviceOnline();

                saveSensorLog(
                    "soil status"
                );
            }
            else {

                markDeviceOnline();
            }

            broadcastState();

            return;
        }

        // ----------------------------------------------------------
        // SOIL ANALOG VALUE
        // Topic: iot/soil/value
        // Example: 350
        // ----------------------------------------------------------

        if (topic === "iot/soil/value") {

            const value =
                Number.parseInt(
                    payload,
                    10
                );

            if (
                !Number.isFinite(value)
            ) {

                console.log(
                    `[${timestamp()}] Invalid soil value: ${payload}`
                );

                return;
            }

            state.soilValue = value;

            markDeviceOnline();

            logSoilValueIfRequired();

            broadcastState();

            return;
        }

        // ----------------------------------------------------------
        // RAIN WATER LEVEL
        // Topic: iot/rain/waterlevel
        // ----------------------------------------------------------

        if (
            topic ===
            "iot/rain/waterlevel"
        ) {

            const value =
                Number.parseFloat(
                    payload
                );

            if (
                !Number.isFinite(value)
            ) {

                console.log(
                    `[${timestamp()}] Invalid water level: ${payload}`
                );

                return;
            }

            state.waterLevel = value;

            markDeviceOnline();

            logRainValueIfRequired();

            broadcastState();

            return;
        }

        // ----------------------------------------------------------
        // RAIN COLLECTED WATER
        // Topic: iot/rain/collected
        // ----------------------------------------------------------

        if (
            topic ===
            "iot/rain/collected"
        ) {

            const value =
                Number.parseFloat(
                    payload
                );

            if (
                !Number.isFinite(value)
            ) {

                console.log(
                    `[${timestamp()}] Invalid collected water: ${payload}`
                );

                return;
            }

            state.collectedWater = value;

            state.rainVolume = value;

            markDeviceOnline();

            logRainValueIfRequired();

            broadcastState();

            return;
        }

        // ----------------------------------------------------------
        // RAINFALL
        // Topic: iot/rain/rainfall
        // ----------------------------------------------------------

        if (
            topic ===
            "iot/rain/rainfall"
        ) {

            const value =
                Number.parseFloat(
                    payload
                );

            if (
                !Number.isFinite(value)
            ) {

                console.log(
                    `[${timestamp()}] Invalid rainfall: ${payload}`
                );

                return;
            }

            state.rainfallMM = value;

            markDeviceOnline();

            logRainValueIfRequired();

            broadcastState();

            return;
        }

        // ----------------------------------------------------------
        // PUMP STATUS
        // Topic: iot/pump
        // ON / OFF
        // ----------------------------------------------------------

        if (topic === "iot/pump") {

            const running =
                payload.toUpperCase() === "ON";

            if (
                running !==
                state.pumpRunning
            ) {

                state.pumpRunning =
                    running;

                markDeviceOnline();

                saveSensorLog("pump");
            }
            else {

                markDeviceOnline();
            }

            broadcastState();

            return;
        }

        // ----------------------------------------------------------
        // SERVO STATUS
        // Topic: iot/servo/status
        // Example: 90
        // ----------------------------------------------------------

        if (
            topic ===
            "iot/servo/status"
        ) {

            const angle =
                Number.parseInt(
                    payload,
                    10
                );

            if (
                !Number.isFinite(angle)
            ) {

                console.log(
                    `[${timestamp()}] Invalid servo angle: ${payload}`
                );

                return;
            }

            state.servoAngle =
                Math.max(
                    0,
                    Math.min(
                        180,
                        angle
                    )
                );

            markDeviceOnline();

            saveSensorLog("servo");

            broadcastState();

            return;
        }
    }
);

// ================================================================
// DEVICE OFFLINE DETECTION
// ================================================================

setInterval(() => {

    if (
        state.connected &&
        state.lastSeen > 0 &&
        Date.now() -
        state.lastSeen >
        OFFLINE_AFTER_MS
    ) {

        state.connected = false;

        console.log(
            `[${timestamp()}] ${DEVICE_ID} marked OFFLINE`
        );

        broadcastState();
    }

}, 5000);

// ================================================================
// MQTT COMMAND PUBLISHER
// Browser -> HTTP -> MQTT -> ESP32
// ================================================================

function publishMQTTCommand(
    res,
    topic,
    message
) {

    if (
        !mqttClient.connected
    ) {

        return res.status(503).json({
            success: false,
            error: "MQTT broker is offline"
        });
    }

    mqttClient.publish(
        topic,
        String(message),
        {
            qos: 0,
            retain: false
        },
        err => {

            if (err) {

                console.error(
                    `[${timestamp()}] MQTT PUBLISH ERROR: ${err.message}`
                );

                return res.status(500).json({
                    success: false,
                    error: "MQTT publish failed"
                });
            }

            console.log(
                `[${timestamp()}] MQTT -> ${topic} = ${message}`
            );

            return res.json({
                success: true,
                topic: topic,
                message: String(message)
            });
        }
    );
}

// ================================================================
// LED COMMANDS
// ================================================================

// GET /led/1/ON
// GET /led/1/OFF
// GET /led/2/ON
// GET /led/3/OFF

app.get(
    "/led/:id/:state",
    (req, res) => {

        const id =
            Number.parseInt(
                req.params.id,
                10
            );

        if (
            ![1, 2, 3].includes(id)
        ) {

            return res.status(400).json({
                success: false,
                error:
                    "LED id must be 1, 2 or 3"
            });
        }

        const command =
            req.params.state
                .toUpperCase();

        if (
            !["ON", "OFF"].includes(
                command
            )
        ) {

            return res.status(400).json({
                success: false,
                error:
                    "LED state must be ON or OFF"
            });
        }

        return publishMQTTCommand(
            res,
            `iot/led${id}`,
            command
        );
    }
);

// ================================================================
// DISCO COMMANDS
// ================================================================

app.get(
    "/disco/on",
    (req, res) => {

        return publishMQTTCommand(
            res,
            "iot/disco",
            "ON"
        );
    }
);

app.get(
    "/disco/off",
    (req, res) => {

        return publishMQTTCommand(
            res,
            "iot/disco",
            "OFF"
        );
    }
);

// ================================================================
// SERVO COMMAND
// ================================================================

// GET /servo/90

app.get(
    "/servo/:angle",
    (req, res) => {

        const parsed =
            Number.parseInt(
                req.params.angle,
                10
            );

        if (
            !Number.isFinite(parsed)
        ) {

            return res.status(400).json({
                success: false,
                error:
                    "Servo angle must be a number"
            });
        }

        const angle =
            Math.max(
                0,
                Math.min(
                    180,
                    parsed
                )
            );

        return publishMQTTCommand(
            res,
            "iot/servo",
            angle
        );
    }
);

// ================================================================
// STATUS API
// ================================================================

app.get(
    "/status",
    (req, res) => {

        res.json({
            connected:
                state.connected,

            deviceId:
                DEVICE_ID,

            lastSeen:
                state.lastSeen,

            mqttConnected:
                mqttClient.connected
        });
    }
);

// ================================================================
// DEVICES API
// ================================================================

app.get(
    "/devices",
    (req, res) => {

        res.json({
            devices: [DEVICE_ID]
        });
    }
);

// ================================================================
// FLAME API
// ================================================================

app.get(
    "/flame",
    (req, res) => {

        res.json(
            getPublicState()
        );
    }
);

// ================================================================
// COMPLETE STATE API
// ================================================================

app.get(
    "/state",
    (req, res) => {

        res.json(
            getPublicState()
        );
    }
);

// ================================================================
// HEALTH CHECK
// ================================================================

app.get(
    "/health",
    (req, res) => {

        res.json({

            ok: true,

            server:
                "iot-server",

            mqttConnected:
                mqttClient.connected,

            deviceConnected:
                state.connected,

            deviceId:
                DEVICE_ID,

            mqttBroker:
                MQTT_URL,

            port:
                PORT
        });
    }
);

// ================================================================
// ROOT
// ================================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );
    }
);

// ================================================================
// GRACEFUL SHUTDOWN
// ================================================================

function shutdown(signal) {

    console.log("");

    console.log(
        `[${timestamp()}] ${signal} received`
    );

    console.log(
        `[${timestamp()}] Shutting down IoT server...`
    );

    mqttClient.end(
        true,
        () => {

            wss.close(
                () => {

                    server.close(
                        () => {

                            db.end(
                                () => {

                                    console.log(
                                        `[${timestamp()}] IoT server stopped`
                                    );

                                    process.exit(0);
                                }
                            );
                        }
                    );
                }
            );
        }
    );
}

process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);

process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);

