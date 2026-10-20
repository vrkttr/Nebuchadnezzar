<?php

session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/layout.php';

$error = null;
$registered = isset($_GET['registered']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === '' || $password === '') {
        $error = 'Bitte Benutzername und Passwort angeben.';
    } else {
        $pdo = getDatabaseConnection();

        $stmt = $pdo->prepare('SELECT id, username, password_hash FROM users WHERE username = :username');
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];

            header('Location: index.php');
            exit;
        }

        $error = 'Benutzername oder Passwort ist falsch.';
    }
}
renderPageStart('Anmeldung', 'login.php');
?>
<?php if ($registered): ?>
<p class="nu-message is-ok">Registrierung erfolgreich, bitte einloggen.</p>
<?php endif; ?>
<?php if ($error !== null): ?>
<p class="nu-message"><?= htmlspecialchars($error) ?></p>
<?php endif; ?>
<form method="post" class="portal-form">
<label class="portal-field"><span class="nu-label">Benutzername</span><input class="nu-input" type="text" name="username" maxlength="32" required autofocus autocomplete="username"></label>
<label class="portal-field"><span class="nu-label">Passwort</span><input class="nu-input" type="password" name="password" required autocomplete="current-password"></label>
<div class="portal-actions"><button class="nu-button" type="submit">Anmelden</button><a class="nu-button" href="register.php">Registrieren</a></div>
</form>
<?php renderPageEnd();
