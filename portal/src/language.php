<?php

require __DIR__ . '/i18n.php';

$language = $_GET['lang'] ?? '';

if (is_string($language) && isset(SUPPORTED_LANGUAGES[$language])) {
    storeLanguage($language);
}

$target = 'index.php';
$referer = $_SERVER['HTTP_REFERER'] ?? '';

if ($referer !== '') {
    $parts = parse_url($referer);

    if (is_array($parts) && ($parts['host'] ?? '') === ($_SERVER['SERVER_NAME'] ?? '')) {
        $path = basename($parts['path'] ?? '');

        if (preg_match('/^[a-z]+\.php$/', $path) && is_file(__DIR__ . '/' . $path) && $path !== 'language.php' && $path !== 'play.php' && $path !== 'logout.php') {
            $target = $path;
        }
    }
}

header('Location: ' . $target);
exit;
