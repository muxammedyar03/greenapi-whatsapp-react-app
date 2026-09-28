import type { Credentials } from './types';

const key = 'green-api-session';

export function loadSession(): Credentials | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
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

export function saveSession(value: Credentials) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function clearSession() {
  localStorage.removeItem(key);
}
