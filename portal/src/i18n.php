<?php

const SUPPORTED_LANGUAGES = ['de' => 'Deutsch', 'en' => 'English'];
const DEFAULT_LANGUAGE = 'de';
const LANGUAGE_COOKIE = 'lang';
const LANGUAGE_COOKIE_LIFETIME = 31536000;

function detectLanguage(): string
{
    $cookie = $_COOKIE[LANGUAGE_COOKIE] ?? null;

    if (is_string($cookie) && isset(SUPPORTED_LANGUAGES[$cookie])) {
        return $cookie;
    }

    $header = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
    $candidates = [];

    foreach (explode(',', $header) as $position => $part) {
        $pieces = explode(';', trim($part));
        $tag = strtolower(trim($pieces[0]));
        $quality = 1.0;

        foreach (array_slice($pieces, 1) as $parameter) {
            if (preg_match('/^\s*q=([0-9.]+)\s*$/', $parameter, $match)) {
                $quality = (float) $match[1];
            }
        }

        if ($tag !== '' && $quality > 0) {
            $candidates[] = [$quality, -$position, substr($tag, 0, 2)];
        }
    }

    rsort($candidates);

    foreach ($candidates as [, , $language]) {
        if (isset(SUPPORTED_LANGUAGES[$language])) {
            return $language;
        }
    }

    return DEFAULT_LANGUAGE;
}

function currentLanguage(): string
{
    static $language = null;

    if ($language === null) {
        $language = detectLanguage();
    }

    return $language;
}

function readMessages(string $language): array
{
    $file = __DIR__ . '/locales/' . $language . '.json';

    if (!is_file($file)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($file), true);

    return is_array($decoded) ? $decoded : [];
}

function messages(): array
{
    static $messages = null;

    if ($messages === null) {
        $language = currentLanguage();
        $messages = readMessages(DEFAULT_LANGUAGE);

        if ($language !== DEFAULT_LANGUAGE) {
            $messages = array_replace($messages, readMessages($language));
        }
    }

    return $messages;
}

function t(string $key, array $params = []): string
{
    $text = messages()[$key] ?? $key;

    foreach ($params as $name => $value) {
        $text = str_replace('{' . $name . '}', (string) $value, $text);
    }

    return $text;
}

function th(string $key, array $params = []): string
{
    return htmlspecialchars(t($key, $params));
}

function storeLanguage(string $language): void
{
    $options = [
        'expires' => time() + LANGUAGE_COOKIE_LIFETIME,
        'path' => '/',
        'samesite' => 'Lax',
        'httponly' => false,
    ];

    $domain = getenv('LANG_COOKIE_DOMAIN');

    if (is_string($domain) && $domain !== '') {
        $options['domain'] = $domain;
    }

    setcookie(LANGUAGE_COOKIE, $language, $options);
}
