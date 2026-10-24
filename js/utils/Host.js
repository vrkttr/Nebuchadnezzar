function host() {
  const bridge = window.verdigrimHost;
  return bridge && typeof bridge.quit !== 'undefined' ? bridge : null;
}

export function canQuitGame() {
  return host() !== null;
}

export function quitGame() {
  host()?.quit();
}
