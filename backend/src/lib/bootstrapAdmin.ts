import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { isDatabaseUnavailableError } from './database.js';

export interface AdminUserClient {
  user: {
    findUnique: (args: {
      where: { email: string };
      select: { id: true; role: true };
    }) => Promise<{ id: string; role: string } | null>;
    create: (args: {
      data: { email: string; password: string; role: 'ADMIN' };
    }) => Promise<{ id: string; email: string }>;
    update: (args: {
      where: { id: string };
      data: { password: string; role: 'ADMIN' };
    }) => Promise<{ id: string; email: string }>;
  };
}

export type SyncAdminResult =
  | { status: 'created' | 'updated' | 'exists'; email: string }
  | { status: 'skipped'; reason: 'missing_env' | 'invalid_credentials' };

export interface SyncAdminOptions {
  env?: NodeJS.ProcessEnv;
  forceUpdate?: boolean;
  strict?: boolean;
  client?: AdminUserClient;
}

/**
 * Validasi dan normalisasi kredensial admin dari environment variables.
 */
export function parseAdminCredentials(env: NodeJS.ProcessEnv = process.env): {
  email: string;
  password: string;
} | null {
  const rawEmail = env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = env.ADMIN_PASSWORD ?? '';

  if (!rawEmail || !rawEmail.includes('@') || password.length < 12) {
    return null;
  }

  return { email: rawEmail, password };
}

/**
 * Menyelaraskan akun Admin pada database secara idempoten.
 * Mode strict (untuk CLI seed) melempar error jika ADMIN_EMAIL/ADMIN_PASSWORD tidak valid.
 */
export async function syncAdminAccount(options: SyncAdminOptions = {}): Promise<SyncAdminResult> {
  const {
    env = process.env,
    forceUpdate = false,
    strict = false,
    client = prisma
  } = options;

  const hasAnyEnv = Boolean(env.ADMIN_EMAIL?.trim() || env.ADMIN_PASSWORD);
  const credentials = parseAdminCredentials(env);

  if (!credentials) {
    if (strict) {
      throw new Error(
        'ADMIN_EMAIL (format email valid) dan ADMIN_PASSWORD (minimal 12 karakter) wajib diatur untuk menyinkronkan admin.'
      );
    }
    return {
      status: 'skipped',
      reason: hasAnyEnv ? 'invalid_credentials' : 'missing_env'
    };
  }

  const existing = await client.user.findUnique({
    where: { email: credentials.email },
    select: { id: true, role: true }
  });

  if (existing && !forceUpdate) {
    return { status: 'exists', email: credentials.email };
  }

  const hashedPassword = await bcrypt.hash(credentials.password, 12);

  if (existing) {
    await client.user.update({
      where: { id: existing.id },
      data: { password: hashedPassword, role: 'ADMIN' }
    });
    return { status: 'updated', email: credentials.email };
  }

  await client.user.create({
    data: {
      email: credentials.email,
      password: hashedPassword,
      role: 'ADMIN'
    }
  });
  return { status: 'created', email: credentials.email };
}

/**
 * Bootstrap otomatis akun Admin saat backend server mulai berjalan.
 * Tidak menghentikan server apabila env tidak diisi atau database sedang belum siap.
 */
export async function ensureAdminOnStartup(env: NodeJS.ProcessEnv = process.env): Promise<SyncAdminResult | null> {
  try {
    const forceUpdate = env.ADMIN_FORCE_SYNC === 'true';
    const result = await syncAdminAccount({ env, forceUpdate, strict: false });

    if (result.status === 'created') {
      console.log(`[Bootstrap] Akun admin otomatis dibuat: ${result.email}`);
    } else if (result.status === 'updated') {
      console.log(`[Bootstrap] Kata sandi akun admin disinkronkan: ${result.email}`);
    } else if (result.status === 'exists') {
      console.log(`[Bootstrap] Akun admin siap digunakan: ${result.email}`);
    } else if (result.status === 'skipped' && result.reason === 'invalid_credentials') {
      console.warn('[Bootstrap] ADMIN_EMAIL atau ADMIN_PASSWORD (< 12 karakter) tidak valid; sinkronisasi admin dilewati.');
    }

    return result;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.warn('[Bootstrap] Database belum terjangkau saat startup; sinkronisasi otomatis admin ditunda.');
    } else {
      console.error('[Bootstrap] Gagal menyinkronkan akun admin saat startup:', error);
    }
    return null;
  }
}
