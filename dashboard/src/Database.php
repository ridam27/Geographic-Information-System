<?php

namespace App;

use mysqli;

class Database
{
    private static ?mysqli $connection = null;

    public static function connection(): mysqli
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        $conn = new mysqli(
            Config::get('DB_HOST', 'localhost'),
            Config::get('DB_USER', 'phpuser'),
            Config::get('DB_PASS', ''),
            Config::get('DB_NAME', 'drone_db')
        );

        if ($conn->connect_error) {
            http_response_code(500);
            die(json_encode([
                'status' => false,
                'message' => 'Database connection failed'
            ]));
        }

        $conn->set_charset('utf8mb4');

        self::$connection = $conn;
        return $conn;
    }
}
