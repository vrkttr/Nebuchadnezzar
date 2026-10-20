<?php

session_start();
require __DIR__ . '/i18n.php';
require __DIR__ . '/layout.php';

$sourceLink = '<a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>';
$licenseLink = '<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">Creative Commons Attribution 3.0 (CC BY 3.0)</a>';

renderPageStart(t('credits.title'), 'credits.php', true, true);
?>
<p class="portal-lead"><?= th('credits.lead') ?></p>

<h2 class="nu-title"><?= th('credits.icons.heading') ?></h2>
<p>
<?= t('credits.icons.text', ['source' => $sourceLink, 'license' => $licenseLink]) ?>
</p>
<table class="portal-table">
<tr><th><?= th('credits.table.usage') ?></th><th><?= th('credits.table.icon') ?></th><th><?= th('credits.table.author') ?></th></tr>
<tr><td><?= th('credits.row.scrap_metal') ?></td><td><a href="https://game-icons.net/1x1/lorc/gears.html" target="_blank" rel="noopener">Gears</a></td><td>Lorc</td></tr>
<tr><td><?= th('credits.row.rag_bundle') ?></td><td><a href="https://game-icons.net/1x1/delapouite/rolled-cloth.html" target="_blank" rel="noopener">Rolled Cloth</a></td><td>Delapouite</td></tr>
<tr><td><?= th('credits.row.canned_food') ?></td><td><a href="https://game-icons.net/1x1/delapouite/opened-food-can.html" target="_blank" rel="noopener">Opened Food Can</a></td><td>Delapouite</td></tr>
<tr><td><?= th('credits.row.rusty_pipe') ?></td><td><a href="https://game-icons.net/1x1/delapouite/crowbar.html" target="_blank" rel="noopener">Crowbar</a></td><td>Delapouite</td></tr>
<tr><td><?= th('credits.row.scrap_helmet') ?></td><td><a href="https://game-icons.net/1x1/delapouite/mining-helmet.html" target="_blank" rel="noopener">Mining Helmet</a></td><td>Delapouite</td></tr>
<tr><td><?= th('credits.row.padded_vest') ?></td><td><a href="https://game-icons.net/1x1/skoll/kevlar-vest.html" target="_blank" rel="noopener">Kevlar Vest</a></td><td>Skoll</td></tr>
<tr><td><?= th('credits.row.patched_trousers') ?></td><td><a href="https://game-icons.net/1x1/lorc/trousers.html" target="_blank" rel="noopener">Trousers</a></td><td>Lorc</td></tr>
<tr><td><?= th('credits.row.backpack') ?></td><td><a href="https://game-icons.net/1x1/delapouite/backpack.html" target="_blank" rel="noopener">Backpack</a></td><td>Delapouite</td></tr>
<tr><td><?= th('credits.row.power_strike') ?></td><td><a href="https://game-icons.net/1x1/lorc/punch-blast.html" target="_blank" rel="noopener">Punch Blast</a></td><td>Lorc</td></tr>
</table>

<h2 class="nu-title"><?= th('credits.fonts.heading') ?></h2>
<ul>
<li><a href="https://fonts.google.com/specimen/Allerta+Stencil" target="_blank" rel="noopener">Allerta Stencil</a>, SIL Open Font License 1.1, &copy; 2010 Matt McInerney</li>
<li><a href="https://fonts.google.com/specimen/Special+Elite" target="_blank" rel="noopener">Special Elite</a>, Apache License 2.0, &copy; Astigmatic</li>
</ul>

<h2 class="nu-title"><?= th('credits.software.heading') ?></h2>
<ul>
<li><a href="https://threejs.org" target="_blank" rel="noopener">three.js</a>, <?= th('credits.license.mit') ?>, &copy; three.js authors</li>
<li><a href="https://howlerjs.com" target="_blank" rel="noopener">howler.js</a>, <?= th('credits.license.mit') ?>, &copy; 2013-2020 James Simpson <?= th('credits.and') ?> GoldFire Studios, Inc.</li>
</ul>
<?php renderPageEnd();
