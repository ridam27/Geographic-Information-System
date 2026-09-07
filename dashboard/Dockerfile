FROM php:8.2-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip \
    && docker-php-ext-install mysqli \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/dashboard
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader

COPY . .

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && sed -i 's/error_reporting = .*/error_reporting = E_ALL \& ~E_DEPRECATED \& ~E_USER_DEPRECATED/' "$PHP_INI_DIR/php.ini"

EXPOSE 8080 8090

CMD ["sh", "-c", "php -S 0.0.0.0:8080 -t public & exec php bin/ws_server.php"]
