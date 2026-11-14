import { type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { isDatabaseUnavailableError, sendDatabaseUnavailable } from '../lib/database.js';
import { assertUniqueUserIdentifier } from '../lib/authValidation.js';

// ================= GURU =================
export const createGuru = async (req: Request, res: Response) => {
    try {
        const { nama, nip, email, password } = req.body;
        if (typeof nama !== 'string' || !nama.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || password.length < 6 || typeof nip !== 'string' || !nip.trim()) {
            return res.status(400).json({ error: 'Nama, NIP, email, dan kata sandi minimal 6 karakter wajib diisi.' });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const cleanNip = nip.trim();

        // Validasi keunikan absolut di seluruh sistem (anti-kloning guru)
        const uniqueCheck = await assertUniqueUserIdentifier({
            identifier: cleanNip,
            email: normalizedEmail,
            entityType: 'GURU'
        });
        if (!uniqueCheck.ok) {
            return res.status(409).json({ error: uniqueCheck.error });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const guruRole = (req.body.role === 'GURU_WALI' ? 'GURU_WALI' : 'GURU_MAPEL');

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { email: normalizedEmail, password: hashedPassword, role: guruRole }
            });

            const guru = await tx.guru.create({
                data: { nama: nama.trim(), nip: cleanNip, userId: user.id }
            });

            return guru;
        });
        res.status(201).json({ message: 'Guru berhasil ditambahkan!', data: result });
    } catch (error) {
        console.error('Error create guru:', error);
        res.status(500).json({ error: 'Gagal menambahkan Guru!' });
    }
};

export const getGuru = async (req: Request, res: Response) => {
    try {
        const data = await prisma.guru.findMany({
            include: { user: { select: { email: true } }, kelasWali: true, mapel: true },
            orderBy: { nama: 'asc' }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data guru' });
    }
};

export const updateGuru = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { nama, nip, email, password } = req.body;

        const guru = await prisma.guru.findUnique({
            where: { id },
            include: { user: true }
        });
        if (!guru) return res.status(404).json({ error: 'Data guru tidak ditemukan' });
        if (nama !== undefined && (typeof nama !== 'string' || !nama.trim())) return res.status(400).json({ error: 'Nama guru tidak boleh kosong.' });
        if (email !== undefined && (typeof email !== 'string' || !email.trim())) return res.status(400).json({ error: 'Email tidak boleh kosong.' });
        if (nip !== undefined && nip !== null && nip !== '' && typeof nip !== 'string') return res.status(400).json({ error: 'NIP tidak valid.' });
        if (password !== undefined && password !== '' && (typeof password !== 'string' || password.length < 6)) return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });

        // Validasi keunikan jika email atau NIP berubah
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
        const targetNip = nip && typeof nip === 'string' && nip.trim() ? nip.trim() : guru.nip;

        if ((normalizedEmail && normalizedEmail !== guru.user.email) || (nip && nip.trim() !== guru.nip)) {
            const uniqueCheck = await assertUniqueUserIdentifier({
                identifier: targetNip,
                email: normalizedEmail || guru.user.email,
                entityType: 'GURU',
                excludeUserId: guru.userId,
                excludeEntityId: guru.id
            });
            if (!uniqueCheck.ok) {
                return res.status(409).json({ error: uniqueCheck.error });
            }
        }

        await prisma.$transaction(async (tx) => {
            const userUpdateData: { email?: string; password?: string } = {};
            if (normalizedEmail && normalizedEmail !== guru.user.email) userUpdateData.email = normalizedEmail;
            if (password && password.trim() !== '') {
                userUpdateData.password = await bcrypt.hash(password, 10);
            }

            if (Object.keys(userUpdateData).length > 0) {
                await tx.user.update({
                    where: { id: guru.userId },
                    data: userUpdateData
                });
            }

            await tx.guru.update({
                where: { id },
                data: {
                    ...(nama !== undefined ? { nama: nama.trim() } : {}),
                    ...(nip !== undefined && typeof nip === 'string' && nip.trim() ? { nip: nip.trim() } : {})
                }
            });
        });

        res.json({ message: 'Data guru berhasil diperbarui' });
    } catch (error) {
        console.error('Error update guru:', error);
        res.status(500).json({ error: 'Gagal memperbarui data guru' });
    }
};

export const deleteGuru = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const guru = await prisma.guru.findUnique({ where: { id } });
        if (!guru) return res.status(404).json({ error: 'Data guru tidak ditemukan' });
        const [subjectAssignments, homeroomAssignments] = await Promise.all([
            prisma.penugasanMapel.count({ where: { guruId: id } }),
            prisma.penugasanWali.count({ where: { guruId: id } })
        ]);
        if (subjectAssignments || homeroomAssignments) return res.status(409).json({ error: 'Guru memiliki riwayat penugasan akademik. Hapus tidak diizinkan agar riwayat nilai tetap terjaga.' });

        await prisma.$transaction(async (tx) => {
            // Putuskan relasi wali kelas jika ada
            await tx.kelas.updateMany({
                where: { waliId: id },
                data: { waliId: null }
            });

            // Putuskan relasi mapel pengampu jika ada
            await tx.mapel.updateMany({
                where: { guruId: id },
                data: { guruId: null }
            });

            // Hapus data profil guru
            await tx.guru.delete({ where: { id } });

            // Hapus user login-nya
            await tx.user.delete({ where: { id: guru.userId } });
        });

        res.json({ message: 'Data guru berhasil dihapus' });
    } catch (error) {
        console.error('Error delete guru:', error);
        res.status(500).json({ error: 'Gagal menghapus data guru' });
    }
};

// ================= SISWA =================
export const createSiswa = async (req: Request, res: Response) => {
    try {
        const { nama, nisn, email, password, kelasId } = req.body;
        if (typeof nama !== 'string' || !nama.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || password.length < 6 || typeof nisn !== 'string' || !/^\d{10}$/.test(nisn)) {
            return res.status(400).json({ error: 'Nama, email, NISN 10 digit, dan kata sandi minimal 6 karakter wajib diisi.' });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const cleanNisn = nisn.trim();

        // Validasi keunikan absolut di seluruh sistem (anti-kloning siswa)
        const uniqueCheck = await assertUniqueUserIdentifier({
            identifier: cleanNisn,
            email: normalizedEmail,
            entityType: 'SISWA'
        });
        if (!uniqueCheck.ok) {
            return res.status(409).json({ error: uniqueCheck.error });
        }
        const activeYear = await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        if (!activeYear) return res.status(400).json({ error: 'Administrator harus menetapkan tahun ajaran aktif terlebih dahulu.' });
        if (kelasId) {
            const classRecord = await prisma.kelas.findUnique({ where: { id: String(kelasId) }, select: { tahunAjaranId: true } });
            if (!classRecord || classRecord.tahunAjaranId !== activeYear.id) {
                return res.status(400).json({ error: 'Kelas tidak terdaftar pada tahun ajaran aktif.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { email: normalizedEmail, password: hashedPassword, role: 'SISWA' }
            });

            const siswa = await tx.siswa.create({
                data: { nama, nisn, kelasId: kelasId || null, userId: user.id }
            });

            if (kelasId) {
                await tx.riwayatKelas.create({ data: { siswaId: siswa.id, kelasId, tahunAjaranId: activeYear.id } });
            }

            return siswa;
        });

        res.status(201).json({ message: 'Siswa berhasil ditambahkan!', data: result });
    } catch (error) {
        console.error('Error create siswa:', error);
        res.status(500).json({ error: 'Gagal menambahkan siswa' });
    }
};

export const getSiswa = async (req: AuthRequest, res: Response) => {
    try {
        const { kelasId } = req.query;
        const yearLabel = req.query.tahunAjaran ? String(req.query.tahunAjaran) : undefined;
        const year = yearLabel
            ? await prisma.tahunAjaran.findUnique({ where: { nama: yearLabel } })
            : await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        if (yearLabel && !year) return res.status(404).json({ error: 'Tahun ajaran tidak ditemukan.' });
        const isGuruUser = req.user?.role === 'GURU' || req.user?.role === 'GURU_MAPEL' || req.user?.role === 'GURU_WALI';
        if (isGuruUser && !year) return res.status(400).json({ error: 'Tahun ajaran aktif belum ditetapkan.' });
        let permittedClassIds: string[] | undefined;
        if (isGuruUser && year && req.user) {
            const guru = await prisma.guru.findUnique({ where: { userId: req.user.id }, select: { id: true } });
            if (!guru) return res.status(403).json({ error: 'Profil guru tidak ditemukan.' });
            const [subjectAssignments, homeroomAssignments] = await Promise.all([
                prisma.penugasanMapel.findMany({ where: { guruId: guru.id, tahunAjaranId: year.id }, select: { kelasId: true } }),
                prisma.penugasanWali.findMany({ where: { guruId: guru.id, tahunAjaranId: year.id }, select: { kelasId: true } })
            ]);
            permittedClassIds = [...new Set([...subjectAssignments, ...homeroomAssignments].map((assignment) => assignment.kelasId))];
            if (kelasId && !permittedClassIds.includes(String(kelasId))) return res.status(403).json({ error: 'Anda tidak memiliki penugasan pada kelas ini.' });
            if (permittedClassIds.length === 0) return res.json([]);
        }
        const data: any[] = await prisma.siswa.findMany({
            where: year
                ? (kelasId || isGuruUser ? {
                    riwayatKelas: { some: { tahunAjaranId: year.id, ...(kelasId ? { kelasId: String(kelasId) } : { kelasId: { in: permittedClassIds || [] } }) } }
                } : undefined)
                : { ...(kelasId ? { kelasId: String(kelasId) } : {}) },
            include: { user: { select: { email: true } }, kelas: true, ortu: { select: { id: true, nama: true } }, ...(year ? { riwayatKelas: { where: { tahunAjaranId: year.id }, include: { kelas: true } } } : {}) },
            orderBy: { nama: 'asc' }
        });
        if (!year) return res.json(data);
        res.json(data.map(({ riwayatKelas, ...siswa }) => ({
            ...siswa,
            kelasId: riwayatKelas[0]?.kelasId || null,
            kelas: riwayatKelas[0]?.kelas || null,
            tahunAjaran: year.nama
        })));
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data siswa' });
    }
};

export const updateSiswa = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { nama, nisn, email, password, kelasId } = req.body;

        const siswa = await prisma.siswa.findUnique({
            where: { id },
            include: { user: true }
        });
        if (!siswa) return res.status(404).json({ error: 'Data siswa tidak ditemukan' });
        if (nama !== undefined && (typeof nama !== 'string' || !nama.trim())) return res.status(400).json({ error: 'Nama siswa tidak boleh kosong.' });
        if (nisn !== undefined && (typeof nisn !== 'string' || !/^\d{10}$/.test(nisn))) return res.status(400).json({ error: 'NISN harus terdiri dari 10 digit.' });
        if (email !== undefined && (typeof email !== 'string' || !email.trim())) return res.status(400).json({ error: 'Email tidak boleh kosong.' });
        if (kelasId !== undefined && kelasId !== null && typeof kelasId !== 'string') return res.status(400).json({ error: 'Kelas tidak valid.' });
        if (password !== undefined && password !== '' && (typeof password !== 'string' || password.length < 6)) return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });

        const year = req.body.tahunAjaran
            ? await prisma.tahunAjaran.findUnique({ where: { nama: String(req.body.tahunAjaran) } })
            : await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        if (req.body.tahunAjaran && !year) return res.status(404).json({ error: 'Tahun ajaran tidak ditemukan.' });
        if (!year) return res.status(400).json({ error: 'Tahun ajaran aktif belum ditetapkan.' });
        if (kelasId) {
            const classRecord = await prisma.kelas.findUnique({ where: { id: kelasId }, select: { tahunAjaranId: true } });
            if (!classRecord || classRecord.tahunAjaranId !== year.id) return res.status(400).json({ error: 'Kelas tidak terdaftar pada tahun ajaran yang dipilih.' });
        }

        // Validasi keunikan jika email atau NISN berubah
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
        const targetNisn = nisn && typeof nisn === 'string' && nisn.trim() ? nisn.trim() : siswa.nisn;

        if ((normalizedEmail && normalizedEmail !== siswa.user.email) || (nisn && nisn.trim() !== siswa.nisn)) {
            const uniqueCheck = await assertUniqueUserIdentifier({
                identifier: targetNisn,
                email: normalizedEmail || siswa.user.email,
                entityType: 'SISWA',
                excludeUserId: siswa.userId,
                excludeEntityId: siswa.id
            });
            if (!uniqueCheck.ok) {
                return res.status(409).json({ error: uniqueCheck.error });
            }
        }

        await prisma.$transaction(async (tx) => {
            const userUpdateData: { email?: string; password?: string } = {};
            if (normalizedEmail && normalizedEmail !== siswa.user.email) userUpdateData.email = normalizedEmail;
            if (password && password.trim() !== '') {
                userUpdateData.password = await bcrypt.hash(password, 10);
            }

            if (Object.keys(userUpdateData).length > 0) {
                await tx.user.update({
                    where: { id: siswa.userId },
                    data: userUpdateData
                });
            }

            const studentData: { nama?: string; nisn?: string; kelasId?: string | null } = {};
            if (nama !== undefined) studentData.nama = nama.trim();
            if (nisn !== undefined) studentData.nisn = nisn;
            // The legacy field mirrors only the active placement, never an edited historic year.
            if (year.aktif && kelasId !== undefined) studentData.kelasId = kelasId || null;
            if (Object.keys(studentData).length) await tx.siswa.update({ where: { id }, data: studentData });

            if (kelasId) {
                await tx.riwayatKelas.upsert({
                    where: { siswaId_tahunAjaranId: { siswaId: id, tahunAjaranId: year.id } },
                    update: { kelasId },
                    create: { siswaId: id, kelasId, tahunAjaranId: year.id }
                });
            } else if (kelasId !== undefined) {
                await tx.riwayatKelas.deleteMany({ where: { siswaId: id, tahunAjaranId: year.id } });
            }
        });

        res.json({ message: 'Data siswa berhasil diperbarui' });
    } catch (error) {
        console.error('Error update siswa:', error);
        res.status(500).json({ error: 'Gagal memperbarui data siswa' });
    }
};

export const deleteSiswa = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const siswa = await prisma.siswa.findUnique({ where: { id } });
        if (!siswa) return res.status(404).json({ error: 'Data siswa tidak ditemukan' });
        const [grades, notes, enrollments] = await Promise.all([
            prisma.nilai.count({ where: { siswaId: id } }),
            prisma.catatanRapor.count({ where: { siswaId: id } }),
            prisma.riwayatKelas.count({ where: { siswaId: id } })
        ]);
        if (grades || notes || enrollments) return res.status(409).json({ error: 'Siswa memiliki riwayat akademik. Hapus tidak diizinkan agar rapor dan riwayat kelas tetap terjaga.' });

        await prisma.$transaction(async (tx) => {
            // Hapus nilai siswa terlebih dahulu jika onDelete cascade belum di semua DB
            await tx.nilai.deleteMany({ where: { siswaId: id } });

            // Hapus siswa
            await tx.siswa.delete({ where: { id } });

            // Hapus user login
            await tx.user.delete({ where: { id: siswa.userId } });
        });

        res.json({ message: 'Data siswa berhasil dihapus' });
    } catch (error) {
        console.error('Error delete siswa:', error);
        res.status(500).json({ error: 'Gagal menghapus data siswa' });
    }
};

// ================= KELAS =================
export const createKelas = async (req: Request, res: Response) => {
    try {
        const { nama, tingkat, waliId, tahunAjaran } = req.body;
        if (typeof nama !== 'string' || !nama.trim() || !Number.isInteger(Number(tingkat)) || Number(tingkat) < 7 || Number(tingkat) > 9) {
            return res.status(400).json({ error: 'Nama kelas dan tingkat 7, 8, atau 9 wajib diisi.' });
        }
        const year = tahunAjaran
            ? await prisma.tahunAjaran.findUnique({ where: { nama: String(tahunAjaran) } })
            : await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        if (!year) return res.status(400).json({ error: 'Tahun ajaran aktif belum ditetapkan.' });
        if (waliId !== undefined && waliId !== null && waliId !== '') {
            const teacher = await prisma.guru.findUnique({ where: { id: String(waliId) }, select: { id: true } });
            if (!teacher) return res.status(404).json({ error: 'Guru wali kelas tidak ditemukan.' });
        }
        const kelas = await prisma.$transaction(async (tx) => {
            const created = await tx.kelas.create({
                data: { nama, tingkat: Number(tingkat), waliId: null, tahunAjaranId: year.id }
            });
            if (waliId) {
                await tx.penugasanWali.create({ data: { guruId: waliId, kelasId: created.id, tahunAjaranId: year.id } });
            }
            return created;
        });
        res.status(201).json({ message: 'Kelas berhasil dibuat!', data: kelas });
    } catch (error) {
        res.status(500).json({ error: 'Gagal membuat kelas' });
    }
};

export const getKelas = async (req: AuthRequest, res: Response) => {
    try {
        const yearLabel = req.query.tahunAjaran ? String(req.query.tahunAjaran) : undefined;
        const year = yearLabel
            ? await prisma.tahunAjaran.findUnique({ where: { nama: yearLabel } })
            : await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        if (yearLabel && !year) return res.status(404).json({ error: 'Tahun ajaran tidak ditemukan.' });
        let permittedClassIds: string[] | undefined;
        const isGuruUser = req.user?.role === 'GURU' || req.user?.role === 'GURU_MAPEL' || req.user?.role === 'GURU_WALI';
        if (isGuruUser && req.user) {
            if (!year) return res.status(400).json({ error: 'Tahun ajaran aktif belum ditetapkan.' });
            const guru = await prisma.guru.findUnique({ where: { userId: req.user.id }, select: { id: true } });
            if (!guru) return res.status(403).json({ error: 'Profil guru tidak ditemukan.' });
            const [subjectAssignments, homeroomAssignments] = await Promise.all([
                prisma.penugasanMapel.findMany({ where: { guruId: guru.id, tahunAjaranId: year.id }, select: { kelasId: true } }),
                prisma.penugasanWali.findMany({ where: { guruId: guru.id, tahunAjaranId: year.id }, select: { kelasId: true } })
            ]);
            permittedClassIds = [...new Set([...subjectAssignments, ...homeroomAssignments].map((assignment) => assignment.kelasId))];
            if (permittedClassIds.length === 0) return res.json([]);
        }
        const data: any[] = await prisma.kelas.findMany({
            where: { ...(year ? { tahunAjaranId: year.id } : {}), ...(permittedClassIds ? { id: { in: permittedClassIds } } : {}) },
            include: {
                wali: { select: { id: true, nama: true } },
                siswa: true,
                ...(year ? {
                    riwayatSiswa: { where: { tahunAjaranId: year.id }, include: { siswa: true } },
                    penugasanWali: { where: { tahunAjaranId: year.id }, include: { guru: { select: { id: true, nama: true } } } }
                } : {})
            },
            orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }]
        });
        if (!year) return res.json(data);
        res.json(data.map(({ riwayatSiswa, penugasanWali, ...kelas }) => ({
            ...kelas,
            waliId: penugasanWali[0]?.guru.id || kelas.waliId,
            wali: penugasanWali[0]?.guru || kelas.wali,
            siswa: riwayatSiswa.map((enrollment: any) => enrollment.siswa),
            tahunAjaran: year.nama
        })));
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data kelas!' });
    }
};

export const updateKelas = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { nama, tingkat, waliId, tahunAjaran } = req.body;

        const kelas = await prisma.kelas.findUnique({ where: { id } });
        if (!kelas) return res.status(404).json({ error: 'Data kelas tidak ditemukan' });
        if (nama !== undefined && (typeof nama !== 'string' || !nama.trim())) return res.status(400).json({ error: 'Nama kelas wajib diisi.' });
        if (tingkat !== undefined && (!Number.isInteger(Number(tingkat)) || Number(tingkat) < 7 || Number(tingkat) > 9)) return res.status(400).json({ error: 'Tingkat kelas harus 7, 8, atau 9.' });

        const [historyCount, subjectAssignmentCount, homeroomAssignmentCount] = await Promise.all([
            prisma.riwayatKelas.count({ where: { kelasId: id } }),
            prisma.penugasanMapel.count({ where: { kelasId: id } }),
            prisma.penugasanWali.count({ where: { kelasId: id } })
        ]);
        if ((historyCount || subjectAssignmentCount || homeroomAssignmentCount) && (nama !== kelas.nama || Number(tingkat) !== kelas.tingkat)) {
            return res.status(409).json({ error: 'Nama/tingkat kelas yang sudah memiliki riwayat tidak dapat diubah. Buat kelas baru untuk tahun ajaran berikutnya.' });
        }
        const year = tahunAjaran
            ? await prisma.tahunAjaran.findUnique({ where: { nama: String(tahunAjaran) } })
            : await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        if (!year) return res.status(400).json({ error: 'Tahun ajaran aktif belum ditetapkan.' });
        if (kelas.tahunAjaranId !== year.id) return res.status(409).json({ error: 'Kelas berasal dari tahun ajaran lain. Buat kelas baru untuk tahun yang dipilih.' });
        if (waliId !== undefined && waliId !== null && waliId !== '') {
            const teacher = await prisma.guru.findUnique({ where: { id: String(waliId) }, select: { id: true } });
            if (!teacher) return res.status(404).json({ error: 'Guru wali kelas tidak ditemukan.' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const savedClass = await tx.kelas.update({
                where: { id },
                data: {
                    ...(nama !== undefined ? { nama: nama.trim() } : {}),
                    ...(tingkat !== undefined ? { tingkat: Number(tingkat) } : {}),
                    ...(year ? {} : { waliId: waliId || null })
                }
            });
            if (year) {
                if (waliId) {
                    await tx.penugasanWali.upsert({
                        where: { kelasId_tahunAjaranId: { kelasId: id, tahunAjaranId: year.id } },
                        update: { guruId: waliId },
                        create: { guruId: waliId, kelasId: id, tahunAjaranId: year.id }
                    });
                } else {
                    await tx.penugasanWali.deleteMany({ where: { kelasId: id, tahunAjaranId: year.id } });
                }
            }
            return savedClass;
        });

        res.json({ message: 'Data kelas berhasil diperbarui', data: updated });
    } catch (error) {
        console.error('Error update kelas:', error);
        res.status(500).json({ error: 'Gagal memperbarui data kelas' });
    }
};

export const deleteKelas = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const kelas = await prisma.kelas.findUnique({ where: { id } });
        if (!kelas) return res.status(404).json({ error: 'Data kelas tidak ditemukan' });

        const [enrollmentCount, subjectAssignmentCount, homeroomAssignmentCount] = await Promise.all([
            prisma.riwayatKelas.count({ where: { kelasId: id } }),
            prisma.penugasanMapel.count({ where: { kelasId: id } }),
            prisma.penugasanWali.count({ where: { kelasId: id } })
        ]);
        if (enrollmentCount || subjectAssignmentCount || homeroomAssignmentCount) {
            return res.status(409).json({ error: 'Kelas memiliki riwayat akademik. Hapus tidak diizinkan agar data tahun ajaran sebelumnya tetap utuh.' });
        }

        await prisma.$transaction(async (tx) => {
            // Lepaskan siswa dari kelas ini (set kelasId jadi null) agar siswa tidak terhapus
            await tx.siswa.updateMany({
                where: { kelasId: id },
                data: { kelasId: null }
            });

            await tx.kelas.delete({ where: { id } });
        });

        res.json({ message: 'Data kelas berhasil dihapus' });
    } catch (error) {
        console.error('Error delete kelas:', error);
        res.status(500).json({ error: 'Gagal menghapus data kelas' });
    }
};

// ================= MAPEL =================
export const createMapel = async (req: Request, res: Response) => {
    try {
        const { nama, kkm, guruId } = req.body;
        const normalizedKkm = kkm === undefined || kkm === '' ? 75 : Number(kkm);
        if (typeof nama !== 'string' || !nama.trim()) return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi.' });
        if (!Number.isFinite(normalizedKkm) || normalizedKkm < 0 || normalizedKkm > 100) return res.status(400).json({ error: 'KKM harus berupa angka antara 0 dan 100.' });
        if (guruId) {
            const teacher = await prisma.guru.findUnique({ where: { id: String(guruId) }, select: { id: true } });
            if (!teacher) return res.status(404).json({ error: 'Guru mata pelajaran tidak ditemukan.' });
        }
        const mapel = await prisma.mapel.create({
            data: { nama: nama.trim(), kkm: normalizedKkm, guruId: guruId || null }
        });
        res.status(201).json({ message: 'Mata pelajaran berhasil ditambahkan!', data: mapel });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menambahkan mata pelajaran!' });
    }
};

export const getMapel = async (req: AuthRequest, res: Response) => {
    try {
        const yearLabel = req.query.tahunAjaran ? String(req.query.tahunAjaran) : undefined;
        const year = yearLabel
            ? await prisma.tahunAjaran.findUnique({ where: { nama: yearLabel } })
            : await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
        if (yearLabel && !year) return res.status(404).json({ error: 'Tahun ajaran tidak ditemukan.' });
        const classId = req.query.kelasId ? String(req.query.kelasId) : undefined;
        let permittedMapelIds: string[] | undefined;
        const isGuruUser = req.user?.role === 'GURU' || req.user?.role === 'GURU_MAPEL' || req.user?.role === 'GURU_WALI';
        if (isGuruUser || classId) {
            if (!year) return res.status(400).json({ error: 'Tahun ajaran aktif belum ditetapkan.' });
            let teacherId: string | undefined;
            if (isGuruUser && req.user) {
                const guru = await prisma.guru.findUnique({ where: { userId: req.user.id }, select: { id: true } });
                if (!guru) return res.json([]);
                teacherId = guru.id;
            }
            const assignments = await prisma.penugasanMapel.findMany({
                where: { tahunAjaranId: year.id, ...(teacherId ? { guruId: teacherId } : {}), ...(classId ? { kelasId: classId } : {}) },
                select: { mapelId: true }
            });
            permittedMapelIds = [...new Set(assignments.map((assignment) => assignment.mapelId))];
            if (permittedMapelIds.length === 0) return res.json([]);
        }
        const data = await prisma.mapel.findMany({
            where: permittedMapelIds ? { id: { in: permittedMapelIds } } : undefined,
            include: { guru: { select: { nama: true } } },
            orderBy: { nama: 'asc' }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data mata pelajaran!' });
    }
};

export const updateMapel = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { nama, kkm, guruId } = req.body;

        const mapel = await prisma.mapel.findUnique({ where: { id } });
        if (!mapel) return res.status(404).json({ error: 'Data mata pelajaran tidak ditemukan' });
        if (nama !== undefined && (typeof nama !== 'string' || !nama.trim())) return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi.' });
        const normalizedKkm = kkm === undefined || kkm === '' ? mapel.kkm : Number(kkm);
        if (!Number.isFinite(normalizedKkm) || normalizedKkm < 0 || normalizedKkm > 100) return res.status(400).json({ error: 'KKM harus berupa angka antara 0 dan 100.' });
        if (guruId) {
            const teacher = await prisma.guru.findUnique({ where: { id: String(guruId) }, select: { id: true } });
            if (!teacher) return res.status(404).json({ error: 'Guru mata pelajaran tidak ditemukan.' });
        }

        const updated = await prisma.mapel.update({
            where: { id },
            data: {
                nama: nama === undefined ? mapel.nama : nama.trim(),
                kkm: normalizedKkm,
                guruId: guruId || null
            }
        });

        res.json({ message: 'Data mata pelajaran berhasil diperbarui', data: updated });
    } catch (error) {
        console.error('Error update mapel:', error);
        res.status(500).json({ error: 'Gagal memperbarui data mata pelajaran' });
    }
};

export const deleteMapel = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const mapel = await prisma.mapel.findUnique({ where: { id } });
        if (!mapel) return res.status(404).json({ error: 'Data mata pelajaran tidak ditemukan' });
        const [gradeCount, assignmentCount] = await Promise.all([
            prisma.nilai.count({ where: { mapelId: id } }),
            prisma.penugasanMapel.count({ where: { mapelId: id } })
        ]);
        if (gradeCount || assignmentCount) return res.status(409).json({ error: 'Mata pelajaran memiliki nilai atau riwayat penugasan. Hapus tidak diizinkan agar data rapor tetap terjaga.' });

        await prisma.mapel.delete({ where: { id } });

        res.json({ message: 'Data mata pelajaran berhasil dihapus' });
    } catch (error) {
        console.error('Error delete mapel:', error);
        res.status(500).json({ error: 'Gagal menghapus data mata pelajaran' });
    }
};

// ================= STATISTIK =================
export const getStats = async (req: Request, res: Response) => {
    try {
        const [totalSiswa, totalGuru, totalKelas, totalMapel] = await Promise.all([
            prisma.siswa.count(),
            prisma.guru.count(),
            prisma.kelas.count(),
            prisma.mapel.count()
        ]);
        res.json({
            siswa: totalSiswa,
            guru: totalGuru,
            kelas: totalKelas,
            mapel: totalMapel
        });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data statistik!' });
    }
};

// ================= TAHUN AJARAN & PENUGASAN HISTORIS =================
export const getTahunAjaran = async (_req: Request, res: Response) => {
    const data = await prisma.tahunAjaran.findMany({ orderBy: { nama: 'desc' } });
    res.json(data);
};

export const createTahunAjaran = async (req: Request, res: Response) => {
    const { nama, aktif } = req.body;
    if (typeof nama !== 'string' || !/^\d{4}\/\d{4}$/.test(nama) || Number(nama.slice(5)) !== Number(nama.slice(0, 4)) + 1) {
        return res.status(400).json({ error: 'Tahun ajaran harus berformat YYYY/YYYY dan berurutan.' });
    }
    if (aktif !== undefined && typeof aktif !== 'boolean') return res.status(400).json({ error: 'Kolom aktif harus berupa boolean.' });

    const year = await prisma.$transaction(async (tx) => {
        if (aktif === true) await tx.tahunAjaran.updateMany({ where: { aktif: true }, data: { aktif: false } });
        return tx.tahunAjaran.upsert({
            where: { nama },
            update: aktif === undefined ? {} : { aktif },
            create: { nama, aktif: aktif === true }
        });
    });
    res.status(201).json({ data: year });
};

export const setTahunAjaranAktif = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const exists = await prisma.tahunAjaran.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: 'Tahun ajaran tidak ditemukan.' });
    await prisma.$transaction([
        prisma.tahunAjaran.updateMany({ where: { aktif: true }, data: { aktif: false } }),
        prisma.tahunAjaran.update({ where: { id }, data: { aktif: true } })
    ]);
    res.json({ message: 'Tahun ajaran aktif diperbarui.' });
};

export const getPenugasan = async (req: Request, res: Response) => {
    const tahunAjaran = String(req.query.tahunAjaran || '');
    if (!/^\d{4}\/\d{4}$/.test(tahunAjaran)) return res.status(400).json({ error: 'Tahun ajaran wajib diisi dengan format YYYY/YYYY.' });
    const year = await prisma.tahunAjaran.findUnique({ where: { nama: tahunAjaran } });
    if (!year) return res.status(404).json({ error: 'Tahun ajaran belum terdaftar.' });
    const [kelasMapel, waliKelas] = await Promise.all([
        prisma.penugasanMapel.findMany({ where: { tahunAjaranId: year.id }, include: { guru: { select: { id: true, nama: true } }, mapel: true, kelas: true }, orderBy: [{ kelas: { tingkat: 'asc' } }, { mapel: { nama: 'asc' } }] }),
        prisma.penugasanWali.findMany({ where: { tahunAjaranId: year.id }, include: { guru: { select: { id: true, nama: true } }, kelas: true }, orderBy: { kelas: { tingkat: 'asc' } } })
    ]);
    res.json({ tahunAjaran, kelasMapel, waliKelas });
};

export const setPenugasanMapel = async (req: Request, res: Response) => {
    const guruId = typeof req.body.guruId === 'string' ? req.body.guruId.trim() : '';
    const mapelId = typeof req.body.mapelId === 'string' ? req.body.mapelId.trim() : '';
    const kelasId = typeof req.body.kelasId === 'string' ? req.body.kelasId.trim() : '';
    const tahunAjaran = typeof req.body.tahunAjaran === 'string' ? req.body.tahunAjaran.trim() : '';
    if (![guruId, mapelId, kelasId, tahunAjaran].every((value) => typeof value === 'string' && value.trim())) {
        return res.status(400).json({ error: 'Guru, mata pelajaran, kelas, dan tahun ajaran wajib diisi.' });
    }
    if (!/^\d{4}\/\d{4}$/.test(tahunAjaran) || Number(tahunAjaran.slice(5)) !== Number(tahunAjaran.slice(0, 4)) + 1) {
        return res.status(400).json({ error: 'Format tahun ajaran tidak valid.' });
    }
    const year = await prisma.tahunAjaran.findUnique({ where: { nama: tahunAjaran } });
    if (!year) return res.status(404).json({ error: 'Tahun ajaran belum terdaftar.' });
    const [teacher, subject, classRecord] = await Promise.all([
        prisma.guru.findUnique({ where: { id: guruId }, select: { id: true } }),
        prisma.mapel.findUnique({ where: { id: mapelId }, select: { id: true } }),
        prisma.kelas.findUnique({ where: { id: kelasId }, select: { tahunAjaranId: true } })
    ]);
    if (!teacher) return res.status(404).json({ error: 'Guru tidak ditemukan.' });
    if (!subject) return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
    if (!classRecord || classRecord.tahunAjaranId !== year.id) return res.status(400).json({ error: 'Kelas tidak terdaftar pada tahun ajaran tersebut.' });
    const data = await prisma.penugasanMapel.upsert({
        where: { mapelId_kelasId_tahunAjaranId: { mapelId, kelasId, tahunAjaranId: year.id } },
        update: { guruId },
        create: { guruId, mapelId, kelasId, tahunAjaranId: year.id }
    });
    res.status(200).json({ data });
};

export const setPenugasanWali = async (req: Request, res: Response) => {
    const guruId = typeof req.body.guruId === 'string' ? req.body.guruId.trim() : '';
    const kelasId = typeof req.body.kelasId === 'string' ? req.body.kelasId.trim() : '';
    const tahunAjaran = typeof req.body.tahunAjaran === 'string' ? req.body.tahunAjaran.trim() : '';
    if (![guruId, kelasId, tahunAjaran].every((value) => typeof value === 'string' && value.trim())) {
        return res.status(400).json({ error: 'Guru, kelas, dan tahun ajaran wajib diisi.' });
    }
    if (!/^\d{4}\/\d{4}$/.test(tahunAjaran) || Number(tahunAjaran.slice(5)) !== Number(tahunAjaran.slice(0, 4)) + 1) {
        return res.status(400).json({ error: 'Format tahun ajaran tidak valid.' });
    }
    const year = await prisma.tahunAjaran.findUnique({ where: { nama: tahunAjaran } });
    if (!year) return res.status(404).json({ error: 'Tahun ajaran belum terdaftar.' });
    const [teacher, classRecord] = await Promise.all([
        prisma.guru.findUnique({ where: { id: guruId }, select: { id: true } }),
        prisma.kelas.findUnique({ where: { id: kelasId }, select: { tahunAjaranId: true } })
    ]);
    if (!teacher) return res.status(404).json({ error: 'Guru tidak ditemukan.' });
    if (!classRecord || classRecord.tahunAjaranId !== year.id) return res.status(400).json({ error: 'Kelas tidak terdaftar pada tahun ajaran tersebut.' });
    const data = await prisma.penugasanWali.upsert({
        where: { kelasId_tahunAjaranId: { kelasId, tahunAjaranId: year.id } },
        update: { guruId },
        create: { guruId, kelasId, tahunAjaranId: year.id }
    });
    res.status(200).json({ data });
};

export const assignSiswaToClass = async (req: Request, res: Response) => {
    const siswaId = String(req.params.id);
    const { kelasId, tahunAjaran } = req.body;
    if (typeof kelasId !== 'string' || !kelasId || typeof tahunAjaran !== 'string' || !tahunAjaran) {
        return res.status(400).json({ error: 'Kelas dan tahun ajaran wajib diisi.' });
    }
    if (!/^\d{4}\/\d{4}$/.test(tahunAjaran) || Number(tahunAjaran.slice(5)) !== Number(tahunAjaran.slice(0, 4)) + 1) {
        return res.status(400).json({ error: 'Format tahun ajaran tidak valid.' });
    }
    const year = await prisma.tahunAjaran.findUnique({ where: { nama: tahunAjaran } });
    if (!year) return res.status(404).json({ error: 'Tahun ajaran belum terdaftar.' });
    const [student, classRecord] = await Promise.all([
        prisma.siswa.findUnique({ where: { id: siswaId }, select: { id: true } }),
        prisma.kelas.findUnique({ where: { id: kelasId }, select: { tahunAjaranId: true } })
    ]);
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    if (!classRecord || classRecord.tahunAjaranId !== year.id) return res.status(400).json({ error: 'Kelas tidak terdaftar pada tahun ajaran tersebut.' });
    const enrollment = await prisma.riwayatKelas.upsert({
        where: { siswaId_tahunAjaranId: { siswaId, tahunAjaranId: year.id } },
        update: { kelasId },
        create: { siswaId, kelasId, tahunAjaranId: year.id }
    });
    if (year.aktif) await prisma.siswa.update({ where: { id: siswaId }, data: { kelasId } });
    res.json({ data: enrollment });
};

export const createOrtu = async (req: Request, res: Response) => {
    const { nama, email, password, siswaIds, nik } = req.body;
    if (
        typeof nama !== 'string' ||
        !nama.trim() ||
        typeof password !== 'string' ||
        password.length < 6 ||
        !Array.isArray(siswaIds) ||
        siswaIds.length === 0 ||
        !siswaIds.every((id) => typeof id === 'string') ||
        typeof nik !== 'string' ||
        !/^\d{16}$/.test(nik.trim())
    ) {
        return res.status(400).json({ error: 'Nama, NIK KTP 16 digit, kata sandi minimal 6 karakter, dan minimal satu siswa wajib diisi.' });
    }
    const cleanNik = nik.trim();
    const normalizedEmail = typeof email === 'string' && email.trim()
        ? email.trim().toLowerCase()
        : `${cleanNik}@alhidayah.sch.id`;

    // Validasi keunikan absolut di seluruh sistem (anti-kloning orang tua)
    const uniqueCheck = await assertUniqueUserIdentifier({
        identifier: cleanNik,
        email: normalizedEmail,
        entityType: 'ORTU'
    });
    if (!uniqueCheck.ok) {
        return res.status(409).json({ error: uniqueCheck.error });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const parent = await prisma.$transaction(async (tx) => {
            const students = await tx.siswa.findMany({ where: { id: { in: siswaIds } }, select: { id: true, ortuId: true } });
            if (students.length !== new Set(siswaIds).size || students.some((student) => student.ortuId)) {
                throw new Error('Satu atau lebih siswa tidak ditemukan atau sudah terhubung ke akun orang tua.');
            }
            const user = await tx.user.create({ data: { email: normalizedEmail, password: hashedPassword, role: 'ORTU' } });
            const ortu = await tx.ortu.create({ data: { nama: nama.trim(), nik: cleanNik, userId: user.id } });
            await tx.siswa.updateMany({ where: { id: { in: siswaIds } }, data: { ortuId: ortu.id } });
            return { id: ortu.id, nama: ortu.nama, nik: ortu.nik, email: user.email, siswaTerhubung: students.length };
        });
        res.status(201).json({ data: parent });
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Gagal membuat akun orang tua.' });
    }
};
