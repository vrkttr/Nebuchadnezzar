<?php

session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/i18n.php';
require __DIR__ . '/layout.php';
require __DIR__ . '/appearance.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$pdo = getDatabaseConnection();
$error = null;

$stmt = $pdo->prepare('SELECT id, name, appear_skin, appear_hair_style, appear_hair_color, appear_top, appear_pants FROM characters WHERE user_id = :user_id');
$stmt->execute(['user_id' => $_SESSION['user_id']]);
$character = $stmt->fetch();

$appearance = readAppearance($_SERVER['REQUEST_METHOD'] === 'POST' ? $_POST : []);

if ($character) {
    $appearance = [
        'skin' => (int) $character['appear_skin'],
        'hair_style' => (int) $character['appear_hair_style'],
        'hair_color' => (int) $character['appear_hair_color'],
        'top' => (int) $character['appear_top'],
        'pants' => (int) $character['appear_pants'],
    ];
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');

    if ($name === '') {
        $error = t('character.error.missing');
    } elseif (strlen($name) > 32) {
        $error = t('character.error.length', ['max' => 32]);
    } elseif (!preg_match('/^[A-Za-z]+$/', $name)) {
        $error = t('character.error.letters');
    } else {
        $stmt = $pdo->prepare('SELECT id FROM characters WHERE name = :name');
        $stmt->execute(['name' => $name]);

        if ($stmt->fetch()) {
            $error = t('character.error.taken');
        } else {
            $stmt = $pdo->prepare('INSERT INTO characters (user_id, name, appear_skin, appear_hair_style, appear_hair_color, appear_top, appear_pants) VALUES (:user_id, :name, :skin, :hair_style, :hair_color, :top, :pants)');
            $stmt->execute($appearance + [
                'user_id' => $_SESSION['user_id'],
                'name' => $name,
            ]);

            header('Location: character.php');
            exit;
        }
    }
}

$previewScheme = $_SERVER['REQUEST_SCHEME'] ?? 'http';
$previewUrl = "{$previewScheme}://{$_SERVER['SERVER_NAME']}:8082/preview.html";
$previewHash = appearanceHash($appearance);

renderPageStart(t('character.title'), 'character.php', true, true);
?>
<?php if ($error !== null): ?>
<p class="nu-message"><?= htmlspecialchars($error) ?></p>
<?php endif; ?>
<div class="portal-editor">
<?php if ($character): ?>
<div class="portal-form">
<div class="nu-label"><?= th('character.yours') ?></div>
<p class="portal-character"><?= htmlspecialchars($character['name']) ?></p>
<p class="portal-hint"><?= th('character.locked') ?></p>
<div class="portal-actions">
<a class="nu-button" href="play.php"><?= th('character.play') ?></a>
</div>
</div>
<?php else: ?>
<form method="post" id="appearance-form" class="portal-form">
<label class="portal-field"><span class="nu-label"><?= th('character.name') ?></span><input class="nu-input" type="text" name="name" maxlength="32" required autofocus autocomplete="off" value="<?= htmlspecialchars($_POST['name'] ?? '') ?>"></label>
<?php renderAppearanceFields($appearance); ?>
<p class="portal-hint"><?= th('character.lockWarning') ?></p>
<div class="portal-actions">
<button class="nu-button" type="submit"><?= th('character.create') ?></button>
</div>
</form>
<?php endif; ?>
<iframe id="appearance-preview" class="portal-preview" title="<?= th('character.preview') ?>" src="<?= htmlspecialchars($previewUrl . '#' . $previewHash) ?>"></iframe>
</div>
<?php if (!$character): ?>
<script>
(function () {
    var form = document.getElementById('appearance-form');
    var frame = document.getElementById('appearance-preview');
    var base = <?= json_encode($previewUrl) ?>;
    var keys = ['skin', 'hair_style', 'hair_color', 'top', 'pants'];

    function update() {
        var values = keys.map(function (key) {
            var checked = form.querySelector('input[name="' + key + '"]:checked');
            return checked ? checked.value : '0';
        });
        frame.src = base + '#' + values.join(',');
    }

    form.addEventListener('change', update);
})();
</script>
<?php endif; ?>
<?php renderPageEnd();
