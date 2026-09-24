<?php

session_start();
require __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$pdo = getDatabaseConnection();
$error = null;

$stmt = $pdo->prepare('SELECT name FROM characters WHERE user_id = :user_id');
$stmt->execute(['user_id' => $_SESSION['user_id']]);
$character = $stmt->fetch();

if (!$character && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');

    if ($name === '') {
        $error = 'Bitte einen Charakternamen angeben.';
    } elseif (strlen($name) > 32) {
        $error = 'Der Name darf maximal 32 Zeichen lang sein.';
    } elseif (!preg_match('/^[A-Za-z]+$/', $name)) {
        $error = 'Der Name darf nur Buchstaben enthalten.';
    } else {
        $stmt = $pdo->prepare('SELECT id FROM characters WHERE name = :name');
        $stmt->execute(['name' => $name]);

        if ($stmt->fetch()) {
            $error = 'Dieser Charaktername ist bereits vergeben.';
        } else {
            $stmt = $pdo->prepare('INSERT INTO characters (user_id, name) VALUES (:user_id, :name)');
            $stmt->execute([
                'user_id' => $_SESSION['user_id'],
                'name' => $name,
            ]);

            header('Location: character.php');
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Charakter - Projekt Nebuchadnezzar</title>
</head>
<body>
<h1>Charakter</h1>
<?php if ($character): ?>
<p>Dein Charakter: <?= htmlspecialchars($character['name']) ?></p>
<?php else: ?>
<?php if ($error !== null): ?>
<p><?= htmlspecialchars($error) ?></p>
<?php endif; ?>
<form method="post">
<label>Charaktername<br><input type="text" name="name" maxlength="32" required></label><br>
<button type="submit">Erstellen</button>
</form>
<?php endif; ?>
<p><a href="index.php">Zurück</a></p>
</body>
</html>
