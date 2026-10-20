<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/i18n.php';

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
<div class="portal-lang"><span class="nu-label"><?= th('portal.language') ?></span>
<?php foreach (SUPPORTED_LANGUAGES as $code => $name): ?>
<a class="portal-lang-link<?= $code === currentLanguage() ? ' is-active' : '' ?>" href="language.php?lang=<?= $code ?>" hreflang="<?= $code ?>" lang="<?= $code ?>"><?= htmlspecialchars($name) ?></a>
<?php endforeach; ?>
</div>
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
