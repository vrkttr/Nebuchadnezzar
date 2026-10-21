<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/i18n.php';
require_once __DIR__ . '/version.php';

function portalMenuItems(): array
{
    $items = [];

    if (!isset($_SESSION['user_id'])) {
        $items[] = [t('portal.menu.login'), 'login.php'];
        $items[] = [t('portal.menu.register'), 'register.php'];
        $items[] = [t('portal.menu.credits'), 'credits.php'];

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
        $items[] = [t('portal.menu.play'), 'play.php'];
        $items[] = [t('portal.menu.character'), 'character.php'];
    } else {
        $items[] = [t('portal.menu.createCharacter'), 'character.php'];
    }

    $items[] = [t('portal.menu.settings'), 'settings.php'];
    $items[] = [t('portal.menu.credits'), 'credits.php'];
    $items[] = [t('portal.menu.logout'), 'logout.php'];

    return $items;
}

function renderPageStart(string $title, string $active, bool $panel = true, bool $wide = false): void
{
    $items = portalMenuItems();
    $heading = htmlspecialchars($title);
    $panelClass = 'portal-panel nu-paper nu-taped' . ($wide ? ' is-wide' : '');
    ?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars(currentLanguage()) ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars(t('portal.pageTitle', ['heading' => $title])) ?></title>
<link rel="stylesheet" href="assets/ui/nebu-ui.css">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="preload" as="image" href="assets/menu-scene.jpg?v=<?= GAME_VERSION ?>">
<link rel="stylesheet" href="assets/portal.css">
</head>
<body class="portal">
<div class="portal-bg"></div>
<video class="portal-scene" autoplay muted loop playsinline preload="auto" poster="assets/menu-scene.jpg?v=<?= GAME_VERSION ?>" tabindex="-1" aria-hidden="true"><source src="assets/menu-scene.webm?v=<?= GAME_VERSION ?>" type="video/webm"></video>
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
<button type="button" id="music-toggle" class="portal-music" data-on="<?= htmlspecialchars(t('portal.music.on')) ?>" data-off="<?= htmlspecialchars(t('portal.music.off')) ?>"></button>
<script src="assets/portal-nav.js"></script>
<script src="assets/menu-music.js" data-src="assets/audio/menu_theme.ogg"></script>
<div class="portal-version"><?= htmlspecialchars(t('portal.version', ['version' => GAME_VERSION])) ?></div>
</body>
</html>
<?php
}
