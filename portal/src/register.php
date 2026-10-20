<?php

session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/i18n.php';
require __DIR__ . '/layout.php';

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $passwordConfirm = $_POST['password_confirm'] ?? '';

    if ($username === '' || $password === '') {
        $error = t('register.error.missing');
    } elseif (strlen($username) > 32) {
        $error = t('register.error.usernameLength', ['max' => 32]);
    } elseif (strlen($password) < 8) {
        $error = t('register.error.passwordLength', ['min' => 8]);
    } elseif ($password !== $passwordConfirm) {
        $error = t('register.error.mismatch');
    } else {
        $pdo = getDatabaseConnection();

        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username');
        $stmt->execute(['username' => $username]);

        if ($stmt->fetch()) {
            $error = t('register.error.taken');
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
renderPageStart(t('register.title'), 'register.php');
?>
<?php if ($error !== null): ?>
<p class="nu-message"><?= htmlspecialchars($error) ?></p>
<?php endif; ?>
<form method="post" class="portal-form">
<label class="portal-field"><span class="nu-label"><?= th('register.username') ?></span><input class="nu-input" type="text" name="username" maxlength="32" required autofocus autocomplete="username"></label>
<label class="portal-field"><span class="nu-label"><?= th('register.password') ?></span><input class="nu-input" type="password" name="password" required autocomplete="new-password"></label>
<label class="portal-field"><span class="nu-label"><?= th('register.confirm') ?></span><input class="nu-input" type="password" name="password_confirm" required autocomplete="new-password"></label>
<div class="portal-actions"><button class="nu-button" type="submit"><?= th('register.submit') ?></button><a class="nu-button" href="login.php"><?= th('register.toLogin') ?></a></div>
</form>
<?php renderPageEnd();
