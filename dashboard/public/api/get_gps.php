<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../vendor/autoload.php";

use App\Database;

$conn = Database::connection();

$sql = "
SELECT d1.id,
       d1.drone_code,
       d1.latitude,
       d1.longitude,
       d1.altitude,
       d1.speed,
       d1.timestamp
FROM drone_gps_logs d1
INNER JOIN (
    SELECT drone_code, MAX(id) AS max_id
    FROM drone_gps_logs
    GROUP BY drone_code
) d2
ON d1.id = d2.max_id
ORDER BY d1.drone_code ASC
";

$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode([
        "status" => false,
        "error" => $conn->error
    ]);
    exit;
}

$data = [];

while ($row = $result->fetch_assoc()) {

    $data[] = [
        "id"         => (int)$row["id"],
        "drone_code" => $row["drone_code"],
        "latitude"   => (float)$row["latitude"],
        "longitude"  => (float)$row["longitude"],
        "altitude"   => (float)$row["altitude"],
        "speed"      => (float)$row["speed"],
        "timestamp"  => $row["timestamp"]
    ];
}

echo json_encode([
    "status" => true,
    "count"  => count($data),
    "data"   => $data
]);
