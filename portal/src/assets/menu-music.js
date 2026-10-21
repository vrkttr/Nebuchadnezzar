(function () {
  var script = document.currentScript;
  var button = document.getElementById('music-toggle');
  var VOLUME = 0.4;
  var enabled = true;
  var audio = new Audio(script.dataset.src);
  audio.loop = true;
  audio.volume = VOLUME;
  audio.preload = 'auto';

  function read(key, fallback) {
    try {
      var value = sessionStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      sessionStorage.setItem(key, String(value));
    } catch (error) {
      return;
    }
  }

  function readEnabled() {
    try {
      return localStorage.getItem('menuMusic') !== 'off';
    } catch (error) {
      return true;
    }
  }

  function writeEnabled(value) {
    try {
      localStorage.setItem('menuMusic', value ? 'on' : 'off');
    } catch (error) {
      return;
    }
  }

  function label() {
    button.textContent = enabled ? button.dataset.on : button.dataset.off;
  }

  function start() {
    if (!enabled || !audio.paused) return;
    audio.play().then(removeGestureListeners).catch(function () {});
  }

  function removeGestureListeners() {
    window.removeEventListener('pointerdown', start, true);
    window.removeEventListener('keydown', start, true);
  }

  audio.addEventListener('loadedmetadata', function () {
    var position = parseFloat(read('menuMusicPosition', '0'));
    if (position > 0 && position < audio.duration) audio.currentTime = position;
  });

  window.addEventListener('pagehide', function () {
    write('menuMusicPosition', audio.currentTime);
  });

  setInterval(function () {
    if (!audio.paused) write('menuMusicPosition', audio.currentTime);
  }, 2000);

  button.addEventListener('portal:relabel', label);

  button.addEventListener('click', function (event) {
    event.stopPropagation();
    enabled = !enabled;
    writeEnabled(enabled);
    label();
    if (enabled) {
      audio.play().catch(function () {});
    } else {
      audio.pause();
    }
  });

  enabled = readEnabled();
  label();
  window.addEventListener('pointerdown', start, true);
  window.addEventListener('keydown', start, true);
  start();
})();
