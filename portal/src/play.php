<?php

session_start();
require __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$pdo = getDatabaseConnection();

$stmt = $pdo->prepare('SELECT id FROM characters WHERE user_id = :user_id');
$stmt->execute(['user_id' => $_SESSION['user_id']]);
$character = $stmt->fetch();

if (!$character) {
    header('Location: character.php');
    exit;
}

$token = bin2hex(random_bytes(32));

$stmt = $pdo->prepare('INSERT INTO login_tokens (token, character_id, expires_at) VALUES (:token, :character_id, DATE_ADD(NOW(), INTERVAL 30 SECOND))');
$stmt->execute([
    'token' => $token,
    'character_id' => $character['id'],
]);

$gameHost = $_SERVER['SERVER_NAME'];
$gameScheme = $_SERVER['REQUEST_SCHEME'] ?? 'http';
$gameUrl = "{$gameScheme}://{$gameHost}:8082/?token=" . urlencode($token);

header("Location: {$gameUrl}");
exit;
