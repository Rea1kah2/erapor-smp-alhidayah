export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export function apiFetch(path: string, init: RequestInit = {}) {
  const url = /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`;
  const headers = new Headers(init.headers);
  headers.delete('Authorization');
  return fetch(url, { ...init, headers, credentials: 'include' });
}
