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
<p><a href="logout.php">Logout</a></p>
<?php else: ?>
<p><a href="login.php">Login</a> | <a href="register.php">Registrieren</a></p>
<?php endif; ?>
</body>
</html>
