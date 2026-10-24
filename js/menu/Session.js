const SESSION_KEY = 'sektor7.session';

export function readSession() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeSession(token) {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    return;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
}
