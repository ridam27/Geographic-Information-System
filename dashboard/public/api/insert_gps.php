<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../vendor/autoload.php";

use App\Database;
use App\Redis;

$conn = Database::connection();

// Read JS
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

// If not JSON, use normal POST data
if (json_last_error() !== JSON_ERROR_NONE) {
    $data = $_POST;
}

// Raspberry Pi sends gps_id
$drone_code = $data['gps_id'] ?? '';
$latitude   = isset($data['latitude']) ? floatval($data['latitude']) : null;
$longitude  = isset($data['longitude']) ? floatval($data['longitude']) : null;
$altitude   = isset($data['altitude']) ? floatval($data['altitude']) : 0;
$speed      = isset($data['speed']) ? floatval($data['speed']) : 0;

// Validate
if ($drone_code === '' || $latitude === null || $longitude === null) {

    http_response_code(400);

    echo json_encode([
        "status" => false,
        "message" => "Missing required fields",
        "received" => $data
    ]);

    exit;
}

// Insert into database
$sql = "INSERT INTO drone_gps_logs
(drone_code, latitude, longitude, altitude, speed)
VALUES (?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "status" => false,
        "message" => $conn->error
    ]);
    exit;
}

$stmt->bind_param(
    "sdddd",
    $drone_code,
    $latitude,
    $longitude,
    $altitude,
    $speed
);

if ($stmt->execute()) {

    // Push the update to any dashboards connected to bin/ws_server.php
    // so they render it immediately instead of waiting on a poll.
    try {
        Redis::client()->publish(Redis::gpsChannel(), json_encode([
            "drone_code" => $drone_code,
            "latitude"   => $latitude,
            "longitude"  => $longitude,
            "altitude"   => $altitude,
            "speed"      => $speed,
            "timestamp"  => date("Y-m-d H:i:s")
        ]));
    } catch (\Exception $e) {
        error_log("Redis publish failed: " . $e->getMessage());
    }

    echo json_encode([
        "status" => true,
        "message" => "GPS data saved successfully",
        "insert_id" => $stmt->insert_id
    ]);

} else {

    echo json_encode([
        "status" => false,
        "message" => $stmt->error
    ]);

}

$stmt->close();
