import { type Response } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { isAcademicYearLabel } from '../lib/academic.js';
import { prisma } from '../lib/prisma.js';
import { isDatabaseUnavailableError, sendDatabaseUnavailable } from '../lib/database.js';

// 1. Ambil daftar anak yang terhubung dengan akun Orang Tua yang sedang login
export const getAnakSaya = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const ortu = await prisma.ortu.findUnique({
            where: { userId },
            include: {
                anak: {
                    include: {
                        kelas: true
                    }
                }
            }
        });

        if (!ortu) {
            return res.status(404).json({ error: 'Profil orang tua tidak ditemukan.' });
        }

        res.json({ anak: ortu.anak });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'mengambil daftar anak');
            return;
        }
        res.status(500).json({ error: 'Gagal mengambil data anak' });
    }
};

// 2. Simpan / Perbarui Catatan Orang Tua pada Hasil Rapor
export const updateCatatanOrtu = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const targetSiswaId = String(req.params.siswaId);
        const { semester, tahunAjaran, catatanOrtu } = req.body;

        if (!targetSiswaId || !semester || !tahunAjaran) {
            return res.status(400).json({ error: 'ID Siswa, semester, dan tahun ajaran wajib disertakan.' });
        }
        if (!['GANJIL', 'GENAP'].includes(semester) || !isAcademicYearLabel(tahunAjaran)) {
            return res.status(400).json({ error: 'Semester atau tahun ajaran tidak valid.' });
        }
        if (typeof catatanOrtu !== 'string') {
            return res.status(400).json({ error: 'Catatan orang tua harus berupa teks.' });
        }

        if (req.user?.role === 'ADMIN') {
            const targetSiswa = await prisma.siswa.findUnique({
                where: { id: targetSiswaId },
                select: { id: true }
            });
            if (!targetSiswa) {
                return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
            }
        } else {
            // Verifikasi kepemilikan anak oleh akun orang tua ini
            const ortu = await prisma.ortu.findUnique({
                where: { userId },
                include: { anak: { select: { id: true } } }
            });

            if (!ortu) {
                return res.status(404).json({ error: 'Profil orang tua tidak ditemukan.' });
            }

            const isChildOfParent = ortu.anak.some((a) => a.id === targetSiswaId);
            if (!isChildOfParent) {
                return res.status(403).json({ error: 'Akses ditolak: Siswa ini bukan anak yang terhubung dengan akun Anda.' });
            }
        }

        // Upsert catatan rapor dengan field catatanOrtu
        const result = await prisma.catatanRapor.upsert({
            where: {
                siswaId_semester_tahunAjaran: {
                    siswaId: targetSiswaId,
                    semester,
                    tahunAjaran
                }
            },
            update: {
                catatanOrtu: catatanOrtu.trim(),
                catatanOrtuAt: new Date()
            },
            create: {
                siswaId: targetSiswaId,
                semester,
                tahunAjaran,
                catatanOrtu: catatanOrtu.trim(),
                catatanOrtuAt: new Date(),
                sakit: 0,
                izin: 0,
                alfa: 0,
                ekskul: []
            }
        });

        res.json({
            message: 'Catatan orang tua berhasil disimpan!',
            data: result
        });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'menyimpan catatan orang tua');
            return;
        }
        console.error('Error updateCatatanOrtu:', error);
        res.status(500).json({ error: 'Gagal menyimpan catatan orang tua' });
    }
};
