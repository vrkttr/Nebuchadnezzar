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
    $autoFullscreen = isset($_POST['auto_fullscreen']) ? 1 : 0;
    $viewDistance = max(1, min(6, (int) ($_POST['view_distance'] ?? 3)));
    $touchControls = in_array($_POST['touch_controls'] ?? '', ['auto', 'on', 'off'], true) ? $_POST['touch_controls'] : 'auto';

    $stmt = $pdo->prepare('UPDATE users SET audio_volume = :volume, audio_ambient = :ambient, audio_muted = :muted, auto_fullscreen = :auto_fullscreen, touch_controls = :touch_controls, view_distance = :view_distance WHERE id = :id');
    $stmt->execute(['volume' => $volume, 'ambient' => $ambient, 'muted' => $muted, 'auto_fullscreen' => $autoFullscreen, 'touch_controls' => $touchControls, 'view_distance' => $viewDistance, 'id' => $_SESSION['user_id']]);
    $saved = true;
}

$stmt = $pdo->prepare('SELECT audio_volume, audio_ambient, audio_muted, auto_fullscreen, touch_controls, view_distance FROM users WHERE id = :id');
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
<section class="portal-group">
<h2 class="portal-group-title"><?= th('settings.display') ?></h2>
<label class="portal-field">
<span class="nu-label portal-field-value"><?= th('settings.viewDistance') ?> <output id="view-value"></output></span>
<input type="range" name="view_distance" min="1" max="6" step="1" value="<?= (int) $settings['view_distance'] ?>" data-output="view-value" data-steps="<?= th('settings.viewSteps') ?>" class="portal-range">
</label>
<p class="portal-hint"><?= th('settings.viewDistanceHint') ?></p>
<label class="portal-field">
<span class="nu-label"><?= th('settings.autoFullscreen') ?></span>
<input type="checkbox" name="auto_fullscreen" value="1" class="portal-checkbox"<?= $settings['auto_fullscreen'] ? ' checked' : '' ?>>
</label>
<p class="portal-hint"><?= th('settings.autoFullscreenHint') ?></p>
<label class="portal-field"><span class="nu-label"><?= th('settings.touchControls') ?></span>
<select class="nu-input" name="touch_controls">
<?php foreach (['auto', 'on', 'off'] as $mode): ?>
<option value="<?= $mode ?>"<?= ($settings['touch_controls'] ?? 'auto') === $mode ? ' selected' : '' ?>><?= th('settings.touchControls.' . $mode) ?></option>
<?php endforeach; ?>
</select></label>
<p class="portal-hint"><?= th('settings.touchControlsHint') ?></p>
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
    var steps = input.dataset.steps ? input.dataset.steps.split('|') : null;
    var update = function () {
        document.getElementById(input.dataset.output).textContent = steps ? steps[Number(input.value) - 1] : input.value + ' %';
    };
    input.addEventListener('input', update);
    update();
});
document.getElementById('language-select').addEventListener('change', function (event) {
    var target = 'language.php?lang=' + encodeURIComponent(event.target.value);
    if (window.portalNavigate) {
        window.portalNavigate(target);
    } else {
        window.location.href = target;
    }
});
</script>
<?php renderPageEnd();
