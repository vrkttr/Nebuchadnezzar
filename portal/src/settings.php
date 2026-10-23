<?php

session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/i18n.php';
require __DIR__ . '/layout.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

const GRAPHICS_GROUPS = [
    'lighting' => ['shadows', 'lights', 'flicker', 'daynight'],
    'sky' => ['clouds', 'haze', 'puddles'],
    'nature' => ['wind', 'birds', 'insects', 'dust', 'debris'],
    'fire' => ['fire', 'smoke'],
];

const GRAPHICS_PRESETS = [
    'high' => ['shadows', 'lights', 'flicker', 'daynight', 'clouds', 'haze', 'puddles', 'wind', 'birds', 'insects', 'dust', 'debris', 'fire', 'smoke'],
    'medium' => ['shadows', 'lights', 'daynight', 'clouds', 'haze', 'wind', 'fire', 'smoke'],
    'low' => [],
];

const SETTINGS_TABS = ['general', 'sound', 'graphics'];

$pdo = getDatabaseConnection();
$saved = false;
$activeTab = in_array($_POST['tab'] ?? '', SETTINGS_TABS, true) ? $_POST['tab'] : 'general';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $volume = max(0, min(100, (int) ($_POST['volume'] ?? 80)));
    $ambient = max(0, min(100, (int) ($_POST['ambient'] ?? 100)));
    $music = max(0, min(100, (int) ($_POST['music'] ?? 40)));
    $muted = isset($_POST['muted']) ? 1 : 0;
    $autoFullscreen = isset($_POST['auto_fullscreen']) ? 1 : 0;
    $touchControls = in_array($_POST['touch_controls'] ?? '', ['auto', 'on', 'off'], true) ? $_POST['touch_controls'] : 'auto';

    $graphics = [];
    foreach (GRAPHICS_GROUPS as $keys) {
        foreach ($keys as $key) {
            $graphics[$key] = isset($_POST['graphics'][$key]);
        }
    }

    $stmt = $pdo->prepare('UPDATE users SET audio_volume = :volume, audio_ambient = :ambient, audio_music = :music, audio_muted = :muted, auto_fullscreen = :auto_fullscreen, touch_controls = :touch_controls, graphics = :graphics WHERE id = :id');
    $stmt->execute(['volume' => $volume, 'ambient' => $ambient, 'music' => $music, 'muted' => $muted, 'auto_fullscreen' => $autoFullscreen, 'touch_controls' => $touchControls, 'graphics' => json_encode($graphics), 'id' => $_SESSION['user_id']]);
    $saved = true;
}

$stmt = $pdo->prepare('SELECT audio_volume, audio_ambient, audio_music, audio_muted, auto_fullscreen, touch_controls, graphics FROM users WHERE id = :id');
$stmt->execute(['id' => $_SESSION['user_id']]);
$settings = $stmt->fetch();
$graphics = json_decode((string) ($settings['graphics'] ?? ''), true);
$graphics = is_array($graphics) ? $graphics : [];

$hasCharacter = false;
$stmt = $pdo->prepare('SELECT id FROM characters WHERE user_id = :user_id');
$stmt->execute(['user_id' => $_SESSION['user_id']]);
$hasCharacter = (bool) $stmt->fetch();

renderPageStart(t('settings.title'), 'settings.php', true, true);

function sliderField(string $name, string $label, int $value, ?string $hint = null): void
{
    ?>
<label class="portal-field">
<span class="nu-label portal-field-value"><?= htmlspecialchars($label) ?> <output id="<?= $name ?>-value"><?= $value ?> %</output></span>
<input type="range" name="<?= $name ?>" min="0" max="100" step="1" value="<?= $value ?>" data-output="<?= $name ?>-value" class="portal-range">
</label>
<?php if ($hint !== null): ?>
<p class="portal-hint"><?= htmlspecialchars($hint) ?></p>
<?php endif;
}
?>
<?php if ($saved): ?>
<p class="nu-message is-ok"><?= th('settings.saved') ?></p>
<?php endif; ?>
<form method="post" class="portal-form portal-settings" data-tab="<?= htmlspecialchars($activeTab) ?>">
<input type="hidden" name="tab" value="<?= htmlspecialchars($activeTab) ?>">
<div class="portal-tabs" role="tablist">
<?php foreach (SETTINGS_TABS as $tab): ?>
<button type="button" class="portal-tab" role="tab" id="tab-<?= $tab ?>" data-tab="<?= $tab ?>" aria-controls="panel-<?= $tab ?>" aria-selected="<?= $tab === $activeTab ? 'true' : 'false' ?>"><?= th('settings.tab.' . $tab) ?></button>
<?php endforeach; ?>
</div>

<div class="portal-tabpanel" role="tabpanel" id="panel-general" aria-labelledby="tab-general"<?= $activeTab === 'general' ? '' : ' hidden' ?>>
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
<h2 class="portal-group-title"><?= th('settings.display') ?></h2>
<label class="portal-switch">
<span class="portal-switch-text"><span class="nu-label"><?= th('settings.autoFullscreen') ?></span><span class="portal-hint"><?= th('settings.autoFullscreenHint') ?></span></span>
<input type="checkbox" name="auto_fullscreen" value="1" class="portal-toggle"<?= $settings['auto_fullscreen'] ? ' checked' : '' ?>>
</label>
<label class="portal-field"><span class="nu-label"><?= th('settings.touchControls') ?></span>
<select class="nu-input" name="touch_controls">
<?php foreach (['auto', 'on', 'off'] as $mode): ?>
<option value="<?= $mode ?>"<?= ($settings['touch_controls'] ?? 'auto') === $mode ? ' selected' : '' ?>><?= th('settings.touchControls.' . $mode) ?></option>
<?php endforeach; ?>
</select></label>
<p class="portal-hint"><?= th('settings.touchControlsHint') ?></p>
</section>
</div>

<div class="portal-tabpanel" role="tabpanel" id="panel-sound" aria-labelledby="tab-sound"<?= $activeTab === 'sound' ? '' : ' hidden' ?>>
<section class="portal-group">
<h2 class="portal-group-title"><?= th('settings.sound') ?></h2>
<?php
sliderField('volume', t('settings.volume'), (int) $settings['audio_volume']);
sliderField('ambient', t('settings.ambient'), (int) $settings['audio_ambient']);
sliderField('music', t('settings.music'), (int) ($settings['audio_music'] ?? 40), t('settings.musicHint'));
?>
<label class="portal-switch">
<span class="portal-switch-text"><span class="nu-label"><?= th('settings.mute') ?></span></span>
<input type="checkbox" name="muted" value="1" class="portal-toggle"<?= $settings['audio_muted'] ? ' checked' : '' ?>>
</label>
</section>
</div>

<div class="portal-tabpanel" role="tabpanel" id="panel-graphics" aria-labelledby="tab-graphics"<?= $activeTab === 'graphics' ? '' : ' hidden' ?>>
<label class="portal-field"><span class="nu-label"><?= th('settings.graphics.preset') ?></span>
<select class="nu-input" id="graphics-preset">
<?php foreach (['high', 'medium', 'low', 'custom'] as $preset): ?>
<option value="<?= $preset ?>"><?= th('settings.graphics.preset.' . $preset) ?></option>
<?php endforeach; ?>
</select></label>
<p class="portal-hint"><?= th('settings.graphics.hint') ?></p>
<?php foreach (GRAPHICS_GROUPS as $group => $keys): ?>
<section class="portal-group">
<h2 class="portal-group-title"><?= th('settings.graphics.group.' . $group) ?></h2>
<?php foreach ($keys as $key): ?>
<label class="portal-switch">
<span class="portal-switch-text"><span class="nu-label"><?= th('settings.graphics.' . $key) ?></span><span class="portal-hint"><?= th('settings.graphics.' . $key . '.hint') ?></span></span>
<input type="checkbox" name="graphics[<?= $key ?>]" value="1" class="portal-toggle" data-graphics="<?= $key ?>"<?= ($graphics[$key] ?? true) ? ' checked' : '' ?>>
</label>
<?php endforeach; ?>
</section>
<?php endforeach; ?>
</div>

<div class="portal-actions portal-actions-sticky">
<button class="nu-button" type="submit"><?= th('settings.save') ?></button>
<?php if ($hasCharacter): ?>
<a class="nu-button" href="play.php"><?= th('settings.backToGame') ?></a>
<?php endif; ?>
</div>
</form>
<script>
(function () {
    var form = document.querySelector('.portal-settings');
    var presets = <?= json_encode(GRAPHICS_PRESETS) ?>;
    var toggles = Array.prototype.slice.call(form.querySelectorAll('[data-graphics]'));
    var select = document.getElementById('graphics-preset');
    var tabInput = form.querySelector('input[name="tab"]');

    function showTab(name) {
        form.querySelectorAll('.portal-tab').forEach(function (tab) {
            tab.setAttribute('aria-selected', tab.dataset.tab === name ? 'true' : 'false');
        });
        form.querySelectorAll('.portal-tabpanel').forEach(function (panel) {
            panel.hidden = panel.id !== 'panel-' + name;
        });
        tabInput.value = name;
        var scroller = form.closest('.portal-scroll');
        if (scroller) scroller.scrollTop = 0;
    }

    form.querySelectorAll('.portal-tab').forEach(function (tab) {
        tab.addEventListener('click', function () { showTab(tab.dataset.tab); });
    });

    function detectPreset() {
        var active = toggles.filter(function (toggle) { return toggle.checked; }).map(function (toggle) { return toggle.dataset.graphics; }).sort().join(',');
        var found = 'custom';
        Object.keys(presets).forEach(function (name) {
            if (presets[name].slice().sort().join(',') === active) found = name;
        });
        select.value = found;
    }

    select.addEventListener('change', function () {
        if (!presets[select.value]) return;
        toggles.forEach(function (toggle) { toggle.checked = presets[select.value].indexOf(toggle.dataset.graphics) !== -1; });
    });
    toggles.forEach(function (toggle) { toggle.addEventListener('change', detectPreset); });
    detectPreset();

    form.querySelectorAll('input[type="range"]').forEach(function (input) {
        input.addEventListener('input', function () {
            document.getElementById(input.dataset.output).textContent = input.value + ' %';
            if (input.name === 'music' && window.portalMusic) window.portalMusic.setVolume(input.value / 100);
        });
    });
    if (window.portalMusic) window.portalMusic.setVolume(<?= (int) ($settings['audio_music'] ?? 40) ?> / 100);

    document.getElementById('language-select').addEventListener('change', function (event) {
        var target = 'language.php?lang=' + encodeURIComponent(event.target.value);
        if (window.portalNavigate) {
            window.portalNavigate(target);
        } else {
            window.location.href = target;
        }
    });
})();
</script>
<?php renderPageEnd();
