<?php

session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/layout.php';

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
renderPageStart('Registrierung', 'register.php');
?>
<?php if ($error !== null): ?>
<p class="nu-message"><?= htmlspecialchars($error) ?></p>
<?php endif; ?>
<form method="post" class="portal-form">
<label class="portal-field"><span class="nu-label">Benutzername</span><input class="nu-input" type="text" name="username" maxlength="32" required autofocus autocomplete="username"></label>
<label class="portal-field"><span class="nu-label">Passwort</span><input class="nu-input" type="password" name="password" required autocomplete="new-password"></label>
<label class="portal-field"><span class="nu-label">Passwort bestätigen</span><input class="nu-input" type="password" name="password_confirm" required autocomplete="new-password"></label>
<div class="portal-actions"><button class="nu-button" type="submit">Registrieren</button><a class="nu-button" href="login.php">Zum Login</a></div>
</form>
<?php renderPageEnd();
