<?php

session_start();
require __DIR__ . '/db.php';

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $passwordConfirm = $_POST['password_confirm'] ?? '';

    if ($username === '' || $password === '') {
        $error = 'Bitte Benutzername und Passwort angeben.';
    } elseif (strlen($username) > 32) {
        $error = 'Benutzername darf maximal 32 Zeichen lang sein.';
    } elseif (strlen($password) < 8) {
        $error = 'Passwort muss mindestens 8 Zeichen lang sein.';
    } elseif ($password !== $passwordConfirm) {
        $error = 'Passwörter stimmen nicht überein.';
    } else {
        $pdo = getDatabaseConnection();

        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username');
        $stmt->execute(['username' => $username]);

        if ($stmt->fetch()) {
            $error = 'Dieser Benutzername ist bereits vergeben.';
        } else {
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);

            $stmt = $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)');
            $stmt->execute([
                'username' => $username,
                'password_hash' => $passwordHash,
            ]);

            header('Location: login.php?registered=1');
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Registrierung - Projekt Nebuchadnezzar</title>
</head>
<body>
<h1>Registrierung</h1>
<?php if ($error !== null): ?>
<p><?= htmlspecialchars($error) ?></p>
<?php endif; ?>
<form method="post">
<label>Benutzername<br><input type="text" name="username" maxlength="32" required></label><br>
<label>Passwort<br><input type="password" name="password" required></label><br>
<label>Passwort bestätigen<br><input type="password" name="password_confirm" required></label><br>
<button type="submit">Registrieren</button>
</form>
<p><a href="login.php">Zum Login</a></p>
<p><a href="index.php">Zurück</a></p>
</body>
</html>
