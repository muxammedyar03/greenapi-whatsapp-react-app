import type { Credentials } from './types';

const key = 'green-api-session';

function read(storage: Storage): Credentials | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Credentials>;
    if (
      typeof data.apiUrl !== 'string' ||
      typeof data.idInstance !== 'string' ||
      typeof data.apiTokenInstance !== 'string' ||
      !data.apiUrl ||
      !data.idInstance ||
      !data.apiTokenInstance
    ) {
      return null;
    }
    return {
      apiUrl: data.apiUrl,
      idInstance: data.idInstance,
      apiTokenInstance: data.apiTokenInstance,
    };
  } catch {
    return null;
  }
}

export function loadSession(): Credentials | null {
  if (typeof window === 'undefined') return null;
  return read(sessionStorage) ?? read(localStorage);
}

export function saveSession(value: Credentials, remember: boolean) {
  const payload = JSON.stringify(value);
  if (remember) {
    localStorage.setItem(key, payload);
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, payload);
  localStorage.removeItem(key);
}

export function clearSession() {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}
