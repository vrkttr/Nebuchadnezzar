<?php

session_start();
require __DIR__ . '/layout.php';

renderPageStart('Credits', 'credits.php', true, true);
?>
<h2 class="nu-title">Icons</h2>
<p>
Die Icons für Gegenstände, Fähigkeiten und Oberfläche stammen von
<a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>
und stehen unter der Lizenz
<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">Creative Commons Attribution 3.0 (CC BY 3.0)</a>.
Änderungen: schwarzer Hintergrund entfernt, Füllfarbe angepasst.
</p>
<table class="portal-table">
<tr><th>Verwendung</th><th>Icon</th><th>Urheber</th></tr>
<tr><td>Schrottmetall</td><td><a href="https://game-icons.net/1x1/lorc/gears.html" target="_blank" rel="noopener">Gears</a></td><td>Lorc</td></tr>
<tr><td>Stoffreste</td><td><a href="https://game-icons.net/1x1/delapouite/rolled-cloth.html" target="_blank" rel="noopener">Rolled Cloth</a></td><td>Delapouite</td></tr>
<tr><td>Konservendose</td><td><a href="https://game-icons.net/1x1/delapouite/opened-food-can.html" target="_blank" rel="noopener">Opened Food Can</a></td><td>Delapouite</td></tr>
<tr><td>Rostiges Brecheisen</td><td><a href="https://game-icons.net/1x1/delapouite/crowbar.html" target="_blank" rel="noopener">Crowbar</a></td><td>Delapouite</td></tr>
<tr><td>Schrotthelm</td><td><a href="https://game-icons.net/1x1/delapouite/mining-helmet.html" target="_blank" rel="noopener">Mining Helmet</a></td><td>Delapouite</td></tr>
<tr><td>Gepolsterte Weste</td><td><a href="https://game-icons.net/1x1/skoll/kevlar-vest.html" target="_blank" rel="noopener">Kevlar Vest</a></td><td>Skoll</td></tr>
<tr><td>Geflickte Hose</td><td><a href="https://game-icons.net/1x1/lorc/trousers.html" target="_blank" rel="noopener">Trousers</a></td><td>Lorc</td></tr>
<tr><td>Rucksack</td><td><a href="https://game-icons.net/1x1/delapouite/backpack.html" target="_blank" rel="noopener">Backpack</a></td><td>Delapouite</td></tr>
<tr><td>Kraftschlag</td><td><a href="https://game-icons.net/1x1/lorc/punch-blast.html" target="_blank" rel="noopener">Punch Blast</a></td><td>Lorc</td></tr>
</table>

<h2 class="nu-title">Schriften</h2>
<ul>
<li><a href="https://fonts.google.com/specimen/Allerta+Stencil" target="_blank" rel="noopener">Allerta Stencil</a>, SIL Open Font License 1.1, &copy; 2010 Matt McInerney</li>
<li><a href="https://fonts.google.com/specimen/Special+Elite" target="_blank" rel="noopener">Special Elite</a>, Apache License 2.0, &copy; Astigmatic</li>
</ul>

<h2 class="nu-title">Software</h2>
<ul>
<li><a href="https://threejs.org" target="_blank" rel="noopener">three.js</a>, MIT-Lizenz, &copy; three.js authors</li>
<li><a href="https://howlerjs.com" target="_blank" rel="noopener">howler.js</a>, MIT-Lizenz, &copy; 2013-2020 James Simpson und GoldFire Studios, Inc.</li>
</ul>
<?php renderPageEnd();
