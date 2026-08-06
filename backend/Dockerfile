FROM php:8.3-cli

RUN docker-php-ext-install pdo pdo_pgsql

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN composer install --no-dev --optimize-autoloader

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8000} -t public"]
