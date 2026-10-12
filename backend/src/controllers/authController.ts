import { type Request, type Response} from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { type AuthRequest} from '../middleware/auth.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'siakad_super_secret_key';

export const registerAdmin = async (req: Request, res: Response) => {
    try{
        const {email, password} = req.body;

        const existingUser = await prisma.user.findUnique({where: {email}});
        if(existingUser){
            return res.status(400).json({error: 'Email sudah terdaftar!'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'ADMIN'
            }
        });

        res.status(201).json({message: 'Admin berhasil didaftarkan!', userId: user.id});
    } catch(error){
        res.status(500).json({error: 'Terjadi kesalahan saat mendaftarkan admin!'});
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, role, nama, nip, nisn, kelasId, anakNisn } = req.body;

        if (!email || !password || !role || !nama) {
            return res.status(400).json({ error: 'Nama, email, password, dan peran (role) wajib diisi!' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Kata sandi minimal 6 karakter!' });
        }

        const validRoles = ['GURU', 'SISWA', 'ORTU'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Role registrasi tidak valid. Pilih Guru, Siswa, atau Orang Tua.' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email sudah terdaftar di sistem! Silakan login.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        if (role === 'GURU') {
            if (nip) {
                const existingGuru = await prisma.guru.findUnique({ where: { nip } });
                if (existingGuru) return res.status(400).json({ error: 'NIP sudah terdaftar untuk guru lain!' });
            }

            const newUser = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'GURU',
                    guru: {
                        create: {
                            nama,
                            nip: nip || null
                        }
                    }
                },
                include: { guru: true }
            });

            return res.status(201).json({
                message: 'Registrasi Guru berhasil! Silakan masuk.',
                userId: newUser.id,
                role: newUser.role
            });
        }

        if (role === 'SISWA') {
            if (!nisn) {
                return res.status(400).json({ error: 'NISN wajib diisi untuk registrasi Siswa!' });
            }

            const existingSiswa = await prisma.siswa.findUnique({ where: { nisn } });
            if (existingSiswa) {
                return res.status(400).json({ error: 'NISN sudah terdaftar di sistem!' });
            }

            const newUser = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'SISWA',
                    siswa: {
                        create: {
                            nama,
                            nisn,
                            kelasId: kelasId || null
                        }
                    }
                },
                include: { siswa: true }
            });

            return res.status(201).json({
                message: 'Registrasi Siswa berhasil! Silakan masuk.',
                userId: newUser.id,
                role: newUser.role
            });
        }

        if (role === 'ORTU') {
            // Cari data anak jika NISN anak dicantumkan
            let anakId: string | undefined;
            if (anakNisn) {
                const targetAnak = await prisma.siswa.findUnique({ where: { nisn: anakNisn } });
                if (targetAnak) anakId = targetAnak.id;
            }

            const newUser = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'ORTU',
                    ortu: {
                        create: {
                            nama
                        }
                    }
                },
                include: { ortu: true }
            });

            // Hubungkan anak jika ditemukan
            if (anakId && newUser.ortu) {
                await prisma.siswa.update({
                    where: { id: anakId },
                    data: { ortuId: newUser.ortu.id }
                });
            }

            return res.status(201).json({
                message: 'Registrasi Orang Tua berhasil! Silakan masuk.',
                userId: newUser.id,
                role: newUser.role
            });
        }

        return res.status(400).json({ error: 'Role tidak didukung' });
    } catch (error: any) {
        console.error('Error register:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server saat registrasi!' });
    }
};

export const login = async (req: Request, res: Response) => {
    try{
        const {email, password} = req.body;

        const user = await prisma.user.findUnique({where: {email}});
        if(!user){
            return res.status(400).json({error: 'Pengguna tidak ditemukan!'}); 
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid){
            return res.status(400).json({error: 'Kata sandi salah!'});
        }

        const token = jwt.sign({id: user.id, role: user.role}, JWT_SECRET, {expiresIn: '1d'});

        res.json({message: 'Login berhasil!', token, role: user.role});
    } catch(error){
        res.status(500).json({error: 'Terjadi kesalahan saat login!'});
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try{
        if(!req.user){
            return res.status(401).json({error: 'Tidak terautentikasi!'});
        }

        const user = await prisma.user.findUnique({
            where: {id: req.user.id},
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                guru: {
                    include: {
                        kelasWali: true,
                        mapel: true
                    }
                },
                siswa: {
                    include: {
                        kelas: {
                            include: {
                                wali: { select: { nama: true } }
                            }
                        }
                    }
                },
                ortu: {
                    include: {
                        anak: {
                            include: {
                                kelas: true
                            }
                        }
                    }
                }
            }
        });

        if(!user){
            return res.status(404).json({error: 'User tak ditemukan!'});
        }

        res.json({user});
    } catch(error){
        res.status(500).json({error: 'Terjadi kesalahan saat mengambil data user!'});
    }
}

