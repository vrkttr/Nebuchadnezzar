<?php

session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/layout.php';

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
renderPageStart('Charakter', 'character.php');
?>
<?php if ($character): ?>
<div class="nu-label">Dein Charakter</div>
<p class="portal-character"><?= htmlspecialchars($character['name']) ?></p>
<div class="portal-actions"><a class="nu-button" href="play.php">Spielen</a></div>
<?php else: ?>
<?php if ($error !== null): ?>
<p class="nu-message"><?= htmlspecialchars($error) ?></p>
<?php endif; ?>
<form method="post" class="portal-form">
<label class="portal-field"><span class="nu-label">Charaktername</span><input class="nu-input" type="text" name="name" maxlength="32" required autofocus autocomplete="off"></label>
<div class="portal-actions"><button class="nu-button" type="submit">Erstellen</button></div>
</form>
<?php endif; ?>
<?php renderPageEnd();
