<?php

session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/i18n.php';
require __DIR__ . '/layout.php';

try {
    $pdo = getDatabaseConnection();
    $pdo->query('SELECT 1');
    $dbStatus = t('home.dbOk');
    $dbOk = true;
} catch (Throwable $e) {
    $dbStatus = t('home.dbFail', ['error' => $e->getMessage()]);
    $dbOk = false;
}

$character = null;
if (isset($_SESSION['user_id']) && isset($pdo)) {
    $stmt = $pdo->prepare('SELECT name FROM characters WHERE user_id = :user_id');
    $stmt->execute(['user_id' => $_SESSION['user_id']]);
    $character = $stmt->fetch();
}

renderPageStart(t('home.title'), 'index.php', false);
?>
<footer class="portal-footer">
<?php if (isset($_SESSION['username'])): ?>
<span class="nu-stamp"><?= htmlspecialchars($_SESSION['username']) ?><?= $character ? ' · ' . htmlspecialchars($character['name']) : '' ?></span>
<?php endif; ?>
<span class="portal-status<?= $dbOk ? '' : ' is-error' ?>"><?= htmlspecialchars($dbStatus) ?></span>
</footer>
<?php renderPageEnd(false);
