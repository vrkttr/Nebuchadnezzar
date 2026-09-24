<?php

session_start();
require __DIR__ . '/db.php';

try {
    $pdo = getDatabaseConnection();
    $pdo->query('SELECT 1');
    $dbStatus = 'Datenbankverbindung erfolgreich.';
} catch (Throwable $e) {
    $dbStatus = 'Datenbankverbindung fehlgeschlagen: ' . $e->getMessage();
}

$character = null;
if (isset($_SESSION['user_id']) && isset($pdo)) {
    $stmt = $pdo->prepare('SELECT name FROM characters WHERE user_id = :user_id');
    $stmt->execute(['user_id' => $_SESSION['user_id']]);
    $character = $stmt->fetch();
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Projekt Nebuchadnezzar - Portal</title>
</head>
<body>
<h1>Projekt Nebuchadnezzar</h1>
<p><?= htmlspecialchars($dbStatus) ?></p>
<?php if (isset($_SESSION['username'])): ?>
<p>Eingeloggt als <?= htmlspecialchars($_SESSION['username']) ?></p>
<?php if ($character): ?>
<p>Charakter: <?= htmlspecialchars($character['name']) ?></p>
<?php else: ?>
<p><a href="character.php">Charakter erstellen</a></p>
<?php endif; ?>
<p><a href="logout.php">Logout</a></p>
<?php else: ?>
<p><a href="login.php">Login</a> | <a href="register.php">Registrieren</a></p>
<?php endif; ?>
</body>
</html>
