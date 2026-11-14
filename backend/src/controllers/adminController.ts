import { type Response } from 'express';
import bcrypt from 'bcryptjs';
import { type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { isDatabaseUnavailableError, sendDatabaseUnavailable } from '../lib/database.js';
import { assertUniqueUserIdentifier } from '../lib/authValidation.js';

// 1. Ambil daftar semua user dengan profilnya
export const getAdminUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                guru: {
                    select: {
                        id: true,
                        nip: true,
                        nama: true,
                        penugasanMapel: {
                            include: { mapel: { select: { nama: true } }, kelas: { select: { nama: true } } }
                        },
                        penugasanWali: {
                            include: { kelas: { select: { nama: true } } }
                        }
                    }
                },
                siswa: {
                    select: {
                        id: true,
                        nisn: true,
                        nama: true,
                        kelas: { select: { id: true, nama: true } },
                        ortu: { select: { id: true, nama: true, nik: true } }
                    }
                },
                ortu: {
                    select: {
                        id: true,
                        nik: true,
                        nama: true,
                        anak: { select: { id: true, nama: true, nisn: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ users });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'mengambil daftar pengguna');
            return;
        }
        res.status(500).json({ error: 'Gagal mengambil daftar pengguna' });
    }
};

// 2. Registrasi Siswa oleh Admin (ID Unik = NISN)
export const registerSiswa = async (req: AuthRequest, res: Response) => {
    try {
        const { nisn, nama, kelasId, password, ortuNik } = req.body;

        if (typeof nisn !== 'string' || !/^\d{10}$/.test(nisn.trim())) {
            return res.status(400).json({ error: 'NISN wajib 10 digit angka.' });
        }
        if (typeof nama !== 'string' || !nama.trim()) {
            return res.status(400).json({ error: 'Nama siswa wajib diisi.' });
        }
        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
        }

        const cleanNisn = nisn.trim();
        const cleanNama = nama.trim();
        const userEmail = `${cleanNisn}@alhidayah.sch.id`;

        // Validasi keunikan absolut di seluruh sistem (anti-kloning)
        const uniqueCheck = await assertUniqueUserIdentifier({
            identifier: cleanNisn,
            email: userEmail,
            entityType: 'SISWA'
        });
        if (!uniqueCheck.ok) {
            return res.status(409).json({ error: uniqueCheck.error });
        }

        // Cek ortu jika ortuNik disertakan
        let matchedOrtuId: string | null = null;
        if (ortuNik && typeof ortuNik === 'string' && ortuNik.trim()) {
            const ortu = await prisma.ortu.findUnique({ where: { nik: ortuNik.trim() } });
            if (ortu) matchedOrtuId = ortu.id;
        }

        const activeYear = await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        const hashedPassword = await bcrypt.hash(password, 10);

        const newSiswa = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: userEmail,
                    password: hashedPassword,
                    role: 'SISWA'
                }
            });

            const siswa = await tx.siswa.create({
                data: {
                    nisn: cleanNisn,
                    nama: cleanNama,
                    kelasId: kelasId ? String(kelasId) : null,
                    userId: user.id,
                    ortuId: matchedOrtuId
                }
            });

            if (kelasId && activeYear) {
                await tx.riwayatKelas.create({
                    data: {
                        siswaId: siswa.id,
                        kelasId: String(kelasId),
                        tahunAjaranId: activeYear.id
                    }
                });
            }

            return siswa;
        });

        res.status(201).json({
            message: 'Akun Siswa berhasil didaftarkan!',
            data: {
                id: newSiswa.id,
                nisn: newSiswa.nisn,
                nama: newSiswa.nama,
                username: cleanNisn
            }
        });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'mendaftarkan siswa');
            return;
        }
        console.error('Error registerSiswa:', error);
        res.status(500).json({ error: 'Gagal mendaftarkan akun siswa' });
    }
};

// 3. Registrasi Guru Mata Pelajaran (ID Unik = NIP)
export const registerGuruMapel = async (req: AuthRequest, res: Response) => {
    try {
        const { nip, nama, password, mapelIds, kelasId } = req.body;

        if (typeof nip !== 'string' || !nip.trim()) {
            return res.status(400).json({ error: 'NIP wajib diisi.' });
        }
        if (typeof nama !== 'string' || !nama.trim()) {
            return res.status(400).json({ error: 'Nama guru wajib diisi.' });
        }
        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
        }

        const cleanNip = nip.trim();
        const cleanNama = nama.trim();
        const userEmail = `${cleanNip}@alhidayah.sch.id`;

        // Validasi keunikan absolut di seluruh sistem (anti-kloning guru)
        const uniqueCheck = await assertUniqueUserIdentifier({
            identifier: cleanNip,
            email: userEmail,
            entityType: 'GURU'
        });
        if (!uniqueCheck.ok) {
            return res.status(409).json({ error: uniqueCheck.error });
        }

        const activeYear = await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        const hashedPassword = await bcrypt.hash(password, 10);

        const newGuru = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: userEmail,
                    password: hashedPassword,
                    role: 'GURU_MAPEL'
                }
            });

            const guru = await tx.guru.create({
                data: {
                    nip: cleanNip,
                    nama: cleanNama,
                    userId: user.id
                }
            });

            // Jika ada mapelIds yang dipilih, catat mapel pengampu default dan buat penugasan pada kelas jika dipilih
            if (Array.isArray(mapelIds) && mapelIds.length > 0) {
                const cleanMapelIds = mapelIds.map((id) => String(id));
                await tx.mapel.updateMany({
                    where: { id: { in: cleanMapelIds } },
                    data: { guruId: guru.id }
                });

                if (kelasId && activeYear) {
                    await tx.penugasanMapel.createMany({
                        data: cleanMapelIds.map((mapelId) => ({
                            guruId: guru.id,
                            mapelId,
                            kelasId: String(kelasId),
                            tahunAjaranId: activeYear.id
                        })),
                        skipDuplicates: true
                    });
                }
            }

            return guru;
        });

        res.status(201).json({
            message: 'Akun Guru Mapel berhasil didaftarkan!',
            data: {
                id: newGuru.id,
                nip: newGuru.nip,
                nama: newGuru.nama,
                username: cleanNip
            }
        });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'mendaftarkan guru mapel');
            return;
        }
        console.error('Error registerGuruMapel:', error);
        res.status(500).json({ error: 'Gagal mendaftarkan guru mapel' });
    }
};

// 4. Registrasi Guru Wali Kelas (ID Unik = NIP)
export const registerGuruWali = async (req: AuthRequest, res: Response) => {
    try {
        const { nip, nama, password, kelasId } = req.body;

        if (typeof nip !== 'string' || !nip.trim()) {
            return res.status(400).json({ error: 'NIP wajib diisi.' });
        }
        if (typeof nama !== 'string' || !nama.trim()) {
            return res.status(400).json({ error: 'Nama guru wajib diisi.' });
        }
        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
        }

        const cleanNip = nip.trim();
        const cleanNama = nama.trim();
        const userEmail = `${cleanNip}@alhidayah.sch.id`;

        // Validasi keunikan absolut di seluruh sistem (anti-kloning guru)
        const uniqueCheck = await assertUniqueUserIdentifier({
            identifier: cleanNip,
            email: userEmail,
            entityType: 'GURU'
        });
        if (!uniqueCheck.ok) {
            return res.status(409).json({ error: uniqueCheck.error });
        }

        const activeYear = await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        const hashedPassword = await bcrypt.hash(password, 10);

        const newGuru = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: userEmail,
                    password: hashedPassword,
                    role: 'GURU_WALI'
                }
            });

            const guru = await tx.guru.create({
                data: {
                    nip: cleanNip,
                    nama: cleanNama,
                    userId: user.id
                }
            });

            if (kelasId && activeYear) {
                // Hapus penugasan wali lama di kelas tersebut jika ada
                await tx.penugasanWali.deleteMany({
                    where: { kelasId: String(kelasId), tahunAjaranId: activeYear.id }
                });
                await tx.penugasanWali.create({
                    data: {
                        guruId: guru.id,
                        kelasId: String(kelasId),
                        tahunAjaranId: activeYear.id
                    }
                });
            }

            return guru;
        });

        res.status(201).json({
            message: 'Akun Guru Wali Kelas berhasil didaftarkan!',
            data: {
                id: newGuru.id,
                nip: newGuru.nip,
                nama: newGuru.nama,
                username: cleanNip
            }
        });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'mendaftarkan guru wali');
            return;
        }
        console.error('Error registerGuruWali:', error);
        res.status(500).json({ error: 'Gagal mendaftarkan guru wali kelas' });
    }
};

// 5. Registrasi Orang Tua (ID Unik = NIK KTP 16 digit)
export const registerOrtu = async (req: AuthRequest, res: Response) => {
    try {
        const { nik, nama, password, siswaNisn } = req.body;

        if (typeof nik !== 'string' || !/^\d{16}$/.test(nik.trim())) {
            return res.status(400).json({ error: 'NIK KTP wajib 16 digit angka.' });
        }
        if (typeof nama !== 'string' || !nama.trim()) {
            return res.status(400).json({ error: 'Nama orang tua wajib diisi.' });
        }
        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
        }

        const cleanNik = nik.trim();
        const cleanNama = nama.trim();
        const userEmail = `${cleanNik}@alhidayah.sch.id`;

        // Validasi keunikan absolut di seluruh sistem (anti-kloning orang tua)
        const uniqueCheck = await assertUniqueUserIdentifier({
            identifier: cleanNik,
            email: userEmail,
            entityType: 'ORTU'
        });
        if (!uniqueCheck.ok) {
            return res.status(409).json({ error: uniqueCheck.error });
        }

        // Cari siswa jika siswaNisn disertakan
        let matchedSiswa: { id: string } | null = null;
        if (siswaNisn && typeof siswaNisn === 'string' && siswaNisn.trim()) {
            matchedSiswa = await prisma.siswa.findUnique({ where: { nisn: siswaNisn.trim() }, select: { id: true } });
            if (!matchedSiswa) {
                return res.status(404).json({ error: `Siswa dengan NISN ${siswaNisn} tidak ditemukan.` });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newOrtu = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: userEmail,
                    password: hashedPassword,
                    role: 'ORTU'
                }
            });

            const ortu = await tx.ortu.create({
                data: {
                    nik: cleanNik,
                    nama: cleanNama,
                    userId: user.id
                }
            });

            if (matchedSiswa) {
                await tx.siswa.update({
                    where: { id: matchedSiswa.id },
                    data: { ortuId: ortu.id }
                });
            }

            return ortu;
        });

        res.status(201).json({
            message: 'Akun Orang Tua berhasil didaftarkan!',
            data: {
                id: newOrtu.id,
                nik: newOrtu.nik,
                nama: newOrtu.nama,
                username: cleanNik
            }
        });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'mendaftarkan orang tua');
            return;
        }
        console.error('Error registerOrtu:', error);
        res.status(500).json({ error: 'Gagal mendaftarkan akun orang tua' });
    }
};

// 6. Reset Password User oleh Admin
export const resetUserPassword = async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { newPassword } = req.body;

        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Kata sandi pengguna berhasil diperbarui.' });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'mereset kata sandi');
            return;
        }
        res.status(500).json({ error: 'Gagal mereset kata sandi pengguna' });
    }
};

// 7. Hapus Akun User oleh Admin
export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);

        if (req.user?.id === id) {
            return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri!' });
        }

        const user = await prisma.user.findUnique({
            where: { id },
            include: { guru: true, siswa: true, ortu: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        }

        await prisma.$transaction(async (tx) => {
            if (user.guru) {
                await tx.kelas.updateMany({ where: { waliId: user.guru.id }, data: { waliId: null } });
                await tx.mapel.updateMany({ where: { guruId: user.guru.id }, data: { guruId: null } });
                await tx.penugasanMapel.deleteMany({ where: { guruId: user.guru.id } });
                await tx.penugasanWali.deleteMany({ where: { guruId: user.guru.id } });
                await tx.guru.delete({ where: { id: user.guru.id } });
            }
            if (user.siswa) {
                await tx.riwayatKelas.deleteMany({ where: { siswaId: user.siswa.id } });
                await tx.catatanRapor.deleteMany({ where: { siswaId: user.siswa.id } });
                await tx.nilai.deleteMany({ where: { siswaId: user.siswa.id } });
                await tx.siswa.delete({ where: { id: user.siswa.id } });
            }
            if (user.ortu) {
                await tx.siswa.updateMany({ where: { ortuId: user.ortu.id }, data: { ortuId: null } });
                await tx.ortu.delete({ where: { id: user.ortu.id } });
            }
            await tx.user.delete({ where: { id } });
        });

        res.json({ message: 'Akun pengguna berhasil dihapus.' });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'menghapus pengguna');
            return;
        }
        console.error('Error deleteUser:', error);
        res.status(500).json({ error: 'Gagal menghapus pengguna' });
    }
};
