<?php

session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/i18n.php';
require __DIR__ . '/layout.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$pdo = getDatabaseConnection();
$saved = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $volume = max(0, min(100, (int) ($_POST['volume'] ?? 80)));
    $ambient = max(0, min(100, (int) ($_POST['ambient'] ?? 100)));
    $muted = isset($_POST['muted']) ? 1 : 0;

    $stmt = $pdo->prepare('UPDATE users SET audio_volume = :volume, audio_ambient = :ambient, audio_muted = :muted WHERE id = :id');
    $stmt->execute(['volume' => $volume, 'ambient' => $ambient, 'muted' => $muted, 'id' => $_SESSION['user_id']]);
    $saved = true;
}

$stmt = $pdo->prepare('SELECT audio_volume, audio_ambient, audio_muted FROM users WHERE id = :id');
$stmt->execute(['id' => $_SESSION['user_id']]);
$settings = $stmt->fetch();

$hasCharacter = false;
$stmt = $pdo->prepare('SELECT id FROM characters WHERE user_id = :user_id');
$stmt->execute(['user_id' => $_SESSION['user_id']]);
$hasCharacter = (bool) $stmt->fetch();

renderPageStart(t('settings.title'), 'settings.php', true);
?>
<?php if ($saved): ?>
<p class="nu-message is-ok"><?= th('settings.saved') ?></p>
<?php endif; ?>
<form method="post" class="portal-form">
<section class="portal-group">
<h2 class="portal-group-title"><?= th('settings.language') ?></h2>
<label class="portal-field"><span class="nu-label"><?= th('settings.languageLabel') ?></span>
<select class="nu-input" id="language-select">
<?php foreach (SUPPORTED_LANGUAGES as $code => $name): ?>
<option value="<?= $code ?>"<?= $code === currentLanguage() ? ' selected' : '' ?>><?= htmlspecialchars($name) ?></option>
<?php endforeach; ?>
</select></label>
</section>
<section class="portal-group">
<h2 class="portal-group-title"><?= th('settings.sound') ?></h2>
<label class="portal-field">
<span class="nu-label portal-field-value"><?= th('settings.volume') ?> <output id="volume-value"><?= (int) $settings['audio_volume'] ?> %</output></span>
<input type="range" name="volume" min="0" max="100" step="1" value="<?= (int) $settings['audio_volume'] ?>" data-output="volume-value" class="portal-range">
</label>
<label class="portal-field">
<span class="nu-label portal-field-value"><?= th('settings.ambient') ?> <output id="ambient-value"><?= (int) $settings['audio_ambient'] ?> %</output></span>
<input type="range" name="ambient" min="0" max="100" step="1" value="<?= (int) $settings['audio_ambient'] ?>" data-output="ambient-value" class="portal-range">
</label>
<label class="portal-field">
<span class="nu-label"><?= th('settings.mute') ?></span>
<input type="checkbox" name="muted" value="1" class="portal-checkbox"<?= $settings['audio_muted'] ? ' checked' : '' ?>>
</label>
</section>
<div class="portal-actions">
<button class="nu-button" type="submit"><?= th('settings.save') ?></button>
<?php if ($hasCharacter): ?>
<a class="nu-button" href="play.php"><?= th('settings.backToGame') ?></a>
<?php endif; ?>
</div>
</form>
<script>
document.querySelectorAll('input[type="range"]').forEach(function (input) {
    input.addEventListener('input', function () {
        document.getElementById(input.dataset.output).textContent = input.value + ' %';
    });
});
document.getElementById('language-select').addEventListener('change', function (event) {
    window.location.href = 'language.php?lang=' + encodeURIComponent(event.target.value);
});
</script>
<?php renderPageEnd();
