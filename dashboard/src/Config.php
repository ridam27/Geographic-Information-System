<?php

namespace App;

class Config
{
    private static bool $loaded = false;

    public static function get(string $key, ?string $default = null): ?string
{
    self::load();

    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key];
    }

    if (array_key_exists($key, $_SERVER)) {
        return $_SERVER[$key];
    }

    $value = getenv($key);

    return $value === false ? $default : $value;
}

    private static function load(): void
    {
        if (self::$loaded) {
            return;
        }

        $root = dirname(__DIR__);
        if (is_file($root . '/.env')) {
            \Dotenv\Dotenv::createImmutable($root)->safeLoad();
        }

        self::$loaded = true;
    }
}
