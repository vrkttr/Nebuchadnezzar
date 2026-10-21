FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql && a2enmod headers

COPY apache-nocache.conf /etc/apache2/conf-available/nocache.conf
RUN a2enconf nocache

COPY src/ /var/www/html/

EXPOSE 80
