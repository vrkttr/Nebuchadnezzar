<?php

require_once __DIR__ . '/db.php';

function portalMenuItems(): array
{
    $items = [];

    if (!isset($_SESSION['user_id'])) {
        $items[] = ['Anmelden', 'login.php'];
        $items[] = ['Registrieren', 'register.php'];
        $items[] = ['Credits', 'credits.php'];

        return $items;
    }

    $hasCharacter = false;

    try {
        $stmt = getDatabaseConnection()->prepare('SELECT id FROM characters WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $_SESSION['user_id']]);
        $hasCharacter = (bool) $stmt->fetch();
    } catch (Throwable $e) {
        $hasCharacter = false;
    }

    if ($hasCharacter) {
        $items[] = ['Spielen', 'play.php'];
        $items[] = ['Charakter', 'character.php'];
    } else {
        $items[] = ['Charakter erstellen', 'character.php'];
    }

    $items[] = ['Einstellungen', 'settings.php'];
    $items[] = ['Credits', 'credits.php'];
    $items[] = ['Abmelden', 'logout.php'];

    return $items;
}

function renderPageStart(string $title, string $active, bool $panel = true, bool $wide = false): void
{
    $items = portalMenuItems();
    $heading = htmlspecialchars($title);
    $panelClass = 'portal-panel nu-paper nu-taped' . ($wide ? ' is-wide' : '');
    ?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= $heading ?> - Sektor Sieben</title>
<link rel="stylesheet" href="assets/ui/nebu-ui.css">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="stylesheet" href="assets/portal.css">
</head>
<body class="portal">
<div class="portal-bg"></div>
<div class="portal-scrim nu-scrim"></div>
<div class="portal-layout">
<nav class="portal-nav">
<a class="portal-logo" href="index.php"><img src="assets/logo.svg" alt="Sektor Sieben"></a>
<ul class="nu-menu">
<?php foreach ($items as [$label, $href]): ?>
<li><a class="nu-menu-item<?= $href === $active ? ' is-active' : '' ?>" href="<?= htmlspecialchars($href) ?>"><?= htmlspecialchars($label) ?></a></li>
<?php endforeach; ?>
</ul>
</nav>
<main class="portal-main">
<?php if ($panel): ?>
<section class="<?= $panelClass ?>">
<h1 class="nu-title"><?= $heading ?></h1>
<hr class="nu-divider">
<?php endif;
}

function renderPageEnd(bool $panel = true): void
{
    if ($panel) {
        echo "</section>\n";
    }
    ?>
</main>
</div>
</body>
</html>
<?php
}
