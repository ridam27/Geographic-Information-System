<?php

namespace App;

use Predis\Client;

class Redis
{
    private static ?Client $client = null;

    public static function client(): Client
    {
        if (self::$client === null) {
            self::$client = new Client(Config::get('REDIS_URI', 'tcp://127.0.0.1:6379'));
        }

        return self::$client;
    }

    public static function gpsChannel(): string
    {
        return Config::get('REDIS_GPS_CHANNEL', 'gps_updates');
    }
}
