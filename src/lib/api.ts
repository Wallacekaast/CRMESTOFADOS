const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');

export async function apiFetch(path: string, init?: RequestInit) {
  const base = API_BASE_URL || '';
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error || `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return res.json();
}

export { API_BASE_URL };
