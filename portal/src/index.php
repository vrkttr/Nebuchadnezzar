<?php

require __DIR__ . '/db.php';

try {
    $pdo = getDatabaseConnection();
    $pdo->query('SELECT 1');
    $status = 'Datenbankverbindung erfolgreich.';
} catch (Throwable $e) {
    $status = 'Datenbankverbindung fehlgeschlagen: ' . $e->getMessage();
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
<p><?= htmlspecialchars($status) ?></p>
</body>
</html>
