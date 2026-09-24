<?php

session_start();
require __DIR__ . '/db.php';

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
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Login - Projekt Nebuchadnezzar</title>
</head>
<body>
<h1>Login</h1>
<?php if ($registered): ?>
<p>Registrierung erfolgreich, bitte einloggen.</p>
<?php endif; ?>
<?php if ($error !== null): ?>
<p><?= htmlspecialchars($error) ?></p>
<?php endif; ?>
<form method="post">
<label>Benutzername<br><input type="text" name="username" maxlength="32" required></label><br>
<label>Passwort<br><input type="password" name="password" required></label><br>
<button type="submit">Login</button>
</form>
<p><a href="register.php">Registrieren</a></p>
<p><a href="index.php">Zurück</a></p>
</body>
</html>
