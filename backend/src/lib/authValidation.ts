import { prisma } from './prisma.js';

export interface UniqueIdentifierCheckParams {
  identifier: string;
  email?: string;
  entityType: 'SISWA' | 'GURU' | 'ORTU';
  excludeUserId?: string;
  excludeEntityId?: string;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Memvalidasi keunikan pengenal pengguna (NISN, NIP, NIK) dan Email di seluruh sistem.
 * Menjamin prinsip "1 ID = 1 Akun" dan mencegah kloning akun antar peran.
 */
export async function assertUniqueUserIdentifier(
  params: UniqueIdentifierCheckParams
): Promise<ValidationResult> {
  const { identifier, email, entityType, excludeUserId, excludeEntityId } = params;

  if (typeof identifier !== 'string' || !identifier.trim()) {
    return { ok: false, error: 'ID Pengguna (NISN/NIP/NIK) wajib diisi.' };
  }

  const cleanId = identifier.trim();

  // 1. Validasi format spesifik per entitas
  if (entityType === 'SISWA') {
    if (!/^\d{10}$/.test(cleanId)) {
      return { ok: false, error: 'NISN siswa wajib terdiri dari tepat 10 digit angka.' };
    }
  } else if (entityType === 'ORTU') {
    if (!/^\d{16}$/.test(cleanId)) {
      return { ok: false, error: 'NIK KTP orang tua wajib terdiri dari tepat 16 digit angka.' };
    }
  } else if (entityType === 'GURU') {
    if (!/^[A-Za-z0-9]{8,30}$/.test(cleanId)) {
      return { ok: false, error: 'NIP/NUPTK guru wajib alfanumerik minimal 8 karakter tanpa spasi.' };
    }
  }

  // 2. Daftar email yang perlu dicek keunikannya
  const emailsToCheck: string[] = [];
  if (email && typeof email === 'string' && email.trim()) {
    emailsToCheck.push(email.trim().toLowerCase());
  }
  const defaultInternalEmail = `${cleanId.toLowerCase()}@alhidayah.sch.id`;
  if (!emailsToCheck.includes(defaultInternalEmail)) {
    emailsToCheck.push(defaultInternalEmail);
  }

  // 3. Cek benturan silang di seluruh tabel pengenal sekolah
  const [existingSiswa, existingGuru, existingOrtu, existingUser] = await Promise.all([
    prisma.siswa.findFirst({
      where: {
        nisn: cleanId,
        ...(excludeEntityId && entityType === 'SISWA' ? { NOT: { id: excludeEntityId } } : {})
      },
      select: { id: true, nama: true, nisn: true }
    }),
    prisma.guru.findFirst({
      where: {
        nip: cleanId,
        ...(excludeEntityId && entityType === 'GURU' ? { NOT: { id: excludeEntityId } } : {})
      },
      select: { id: true, nama: true, nip: true }
    }),
    prisma.ortu.findFirst({
      where: {
        nik: cleanId,
        ...(excludeEntityId && entityType === 'ORTU' ? { NOT: { id: excludeEntityId } } : {})
      },
      select: { id: true, nama: true, nik: true }
    }),
    prisma.user.findFirst({
      where: {
        email: { in: emailsToCheck },
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {})
      },
      select: { id: true, email: true, role: true }
    })
  ]);

  if (existingSiswa) {
    return {
      ok: false,
      error: `ID "${cleanId}" sudah terdaftar sebagai NISN Siswa (${existingSiswa.nama}). Satu ID hanya dapat digunakan untuk 1 akun unik.`
    };
  }

  if (existingGuru) {
    return {
      ok: false,
      error: `ID "${cleanId}" sudah terdaftar sebagai NIP Guru (${existingGuru.nama}). Guru yang merangkap Wali Kelas cukup memiliki 1 akun terdaftar.`
    };
  }

  if (existingOrtu) {
    return {
      ok: false,
      error: `ID "${cleanId}" sudah terdaftar sebagai NIK Orang Tua (${existingOrtu.nama}). Untuk anak kedua/selanjutnya, silakan tautkan langsung ke NIK ini tanpa membuat akun baru.`
    };
  }

  if (existingUser) {
    return {
      ok: false,
      error: `Email "${existingUser.email}" sudah digunakan oleh akun lain dengan role ${existingUser.role}. Setiap akun wajib menggunakan email yang unik.`
    };
  }

  return { ok: true };
}
