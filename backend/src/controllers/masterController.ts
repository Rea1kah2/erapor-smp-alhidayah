import { type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ================= GURU =================
export const createGuru = async (req: Request, res: Response) => {
    try {
        const { nama, nip, email, password } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'Email sudah terdaftar' });

        if (nip) {
            const existingNip = await prisma.guru.findUnique({ where: { nip } });
            if (existingNip) return res.status(400).json({ error: 'NIP sudah digunakan' });
        }

        const hashedPassword = await bcrypt.hash(password || 'guru12345', 10);

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { email, password: hashedPassword, role: 'GURU' }
            });

            const guru = await tx.guru.create({
                data: { nama, nip: nip || null, userId: user.id }
            });

            return guru;
        });
        res.status(201).json({ message: 'Guru berhasil ditambahkan!', data: result });
    } catch (error) {
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

        // Cek jika email berubah dan sudah dipakai user lain
        if (email && email !== guru.user.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) return res.status(400).json({ error: 'Email sudah digunakan oleh akun lain' });
        }

        // Cek jika NIP berubah dan sudah dipakai guru lain
        if (nip && nip !== guru.nip) {
            const nipTaken = await prisma.guru.findUnique({ where: { nip } });
            if (nipTaken) return res.status(400).json({ error: 'NIP sudah digunakan oleh guru lain' });
        }

        await prisma.$transaction(async (tx) => {
            const userUpdateData: { email?: string; password?: string } = {};
            if (email) userUpdateData.email = email;
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
                    nama,
                    nip: nip || null
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

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'Email sudah terdaftar!' });

        const existingNisn = await prisma.siswa.findUnique({ where: { nisn } });
        if (existingNisn) return res.status(400).json({ error: 'NISN sudah terdaftar!' });

        const hashedPassword = await bcrypt.hash(password || 'siswa12345', 10);

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { email, password: hashedPassword, role: 'SISWA' }
            });

            const siswa = await tx.siswa.create({
                data: { nama, nisn, kelasId: kelasId || null, userId: user.id }
            });

            return siswa;
        });

        res.status(201).json({ message: 'Siswa berhasil ditambahkan!', data: result });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menambahkan siswa' });
    }
};

export const getSiswa = async (req: Request, res: Response) => {
    try {
        const { kelasId } = req.query;
        const data = await prisma.siswa.findMany({
            where: {
                ...(kelasId ? { kelasId: String(kelasId) } : {})
            },
            include: { user: { select: { email: true } }, kelas: true },
            orderBy: { nama: 'asc' }
        });
        res.json(data);
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

        if (email && email !== siswa.user.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) return res.status(400).json({ error: 'Email sudah digunakan oleh akun lain' });
        }

        if (nisn && nisn !== siswa.nisn) {
            const nisnTaken = await prisma.siswa.findUnique({ where: { nisn } });
            if (nisnTaken) return res.status(400).json({ error: 'NISN sudah digunakan oleh siswa lain' });
        }

        await prisma.$transaction(async (tx) => {
            const userUpdateData: { email?: string; password?: string } = {};
            if (email) userUpdateData.email = email;
            if (password && password.trim() !== '') {
                userUpdateData.password = await bcrypt.hash(password, 10);
            }

            if (Object.keys(userUpdateData).length > 0) {
                await tx.user.update({
                    where: { id: siswa.userId },
                    data: userUpdateData
                });
            }

            await tx.siswa.update({
                where: { id },
                data: {
                    nama,
                    nisn,
                    kelasId: kelasId || null
                }
            });
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
        const { nama, tingkat, waliId } = req.body;
        const kelas = await prisma.kelas.create({
            data: { nama, tingkat: Number(tingkat), waliId: waliId || null }
        });
        res.status(201).json({ message: 'Kelas berhasil dibuat!', data: kelas });
    } catch (error) {
        res.status(500).json({ error: 'Gagal membuat kelas' });
    }
};

export const getKelas = async (req: Request, res: Response) => {
    try {
        const data = await prisma.kelas.findMany({
            include: { wali: { select: { nama: true } }, siswa: true },
            orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }]
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data kelas!' });
    }
};

export const updateKelas = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { nama, tingkat, waliId } = req.body;

        const kelas = await prisma.kelas.findUnique({ where: { id } });
        if (!kelas) return res.status(404).json({ error: 'Data kelas tidak ditemukan' });

        const updated = await prisma.kelas.update({
            where: { id },
            data: {
                nama,
                tingkat: Number(tingkat),
                waliId: waliId || null
            }
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
        const mapel = await prisma.mapel.create({
            data: { nama, kkm: kkm ? Number(kkm) : 75, guruId: guruId || null }
        });
        res.status(201).json({ message: 'Mata pelajaran berhasil ditambahkan!', data: mapel });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menambahkan mata pelajaran!' });
    }
};

export const getMapel = async (req: Request, res: Response) => {
    try {
        const data = await prisma.mapel.findMany({
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

        const updated = await prisma.mapel.update({
            where: { id },
            data: {
                nama,
                kkm: kkm ? Number(kkm) : 75,
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

        await prisma.$transaction(async (tx) => {
            // Hapus nilai terkait mapel
            await tx.nilai.deleteMany({ where: { mapelId: id } });

            await tx.mapel.delete({ where: { id } });
        });

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