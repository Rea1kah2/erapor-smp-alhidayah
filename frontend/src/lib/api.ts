export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export type UserRole = 'ADMIN' | 'GURU_MAPEL' | 'GURU_WALI' | 'SISWA' | 'ORTU' | 'GURU';

export function isGuru(role?: string): boolean {
  return role === 'GURU' || role === 'GURU_MAPEL' || role === 'GURU_WALI';
}

export function isGuruWali(role?: string): boolean {
  return role === 'GURU_WALI';
}

export function isGuruMapel(role?: string): boolean {
  return role === 'GURU_MAPEL';
}

export function formatRoleLabel(role?: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'GURU_MAPEL':
      return 'Guru Mapel';
    case 'GURU_WALI':
      return 'Wali Kelas';
    case 'SISWA':
      return 'Murid';
    case 'ORTU':
      return 'Orang Tua';
    case 'GURU':
      return 'Dewan Guru';
    default:
      return role || 'Pengguna';
  }
}

export function apiFetch(path: string, init: RequestInit = {}) {
  const url = /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`;
  const headers = new Headers(init.headers);
  headers.delete('Authorization');
  return fetch(url, { ...init, headers, credentials: 'include' });
}
