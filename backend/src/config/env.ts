import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET wajib diatur dan minimal 32 karakter.');
}

export const JWT_SECRET = jwtSecret;

const cookieSameSite = (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase();

if (!['lax', 'strict', 'none'].includes(cookieSameSite)) {
  throw new Error('COOKIE_SAME_SITE harus bernilai lax, strict, atau none.');
}

if (cookieSameSite === 'none' && process.env.NODE_ENV !== 'production') {
  throw new Error('COOKIE_SAME_SITE=none hanya boleh digunakan pada environment production HTTPS.');
}

export const COOKIE_SAME_SITE = cookieSameSite as 'lax' | 'strict' | 'none';
export const COOKIE_SECURE = process.env.NODE_ENV === 'production' || COOKIE_SAME_SITE === 'none';
