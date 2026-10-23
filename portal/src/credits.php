<?php

session_start();
require __DIR__ . '/i18n.php';
require __DIR__ . '/layout.php';

renderPageStart(t('credits.title'), 'credits.php', true, true);
?>
<p class="portal-lead"><?= th('credits.lead') ?></p>

<h2 class="nu-title"><?= th('credits.own.heading') ?></h2>
<p><?= th('credits.own.text') ?></p>

<h2 class="nu-title"><?= th('credits.fonts.heading') ?></h2>
<ul>
<li><a href="https://fonts.google.com/specimen/Allerta+Stencil" target="_blank" rel="noopener">Allerta Stencil</a>, SIL Open Font License 1.1, &copy; 2010 Matt McInerney</li>
<li><a href="https://fonts.google.com/specimen/Special+Elite" target="_blank" rel="noopener">Special Elite</a>, Apache License 2.0, &copy; Astigmatic</li>
</ul>

<h2 class="nu-title"><?= th('credits.software.heading') ?></h2>
<ul>
<li><a href="https://threejs.org" target="_blank" rel="noopener">three.js</a>, <?= th('credits.license.mit') ?>, &copy; three.js authors</li>
<li><a href="https://howlerjs.com" target="_blank" rel="noopener">howler.js</a>, <?= th('credits.license.mit') ?>, &copy; 2013-2020 James Simpson <?= th('credits.and') ?> GoldFire Studios, Inc.</li>
<li><a href="https://nodejs.org" target="_blank" rel="noopener">Node.js</a>, <?= th('credits.license.mit') ?>, &copy; OpenJS Foundation <?= th('credits.and') ?> Node.js contributors</li>
<li><a href="https://github.com/websockets/ws" target="_blank" rel="noopener">ws</a>, <?= th('credits.license.mit') ?>, &copy; Einar Otto Stangvik <?= th('credits.and') ?> contributors</li>
<li><a href="https://github.com/sidorares/node-mysql2" target="_blank" rel="noopener">mysql2</a>, <?= th('credits.license.mit') ?>, &copy; Andrey Sidorov <?= th('credits.and') ?> contributors</li>
<li><a href="https://mariadb.org" target="_blank" rel="noopener">MariaDB</a>, GPL v2, &copy; MariaDB Foundation</li>
<li><a href="https://www.mapeditor.org" target="_blank" rel="noopener">Tiled</a> (<?= th('credits.tiled.note') ?>), &copy; Thorbj&oslash;rn Lindeijer</li>
</ul>
<?php renderPageEnd();
