import { type Request, type Response} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { type AuthRequest} from '../middleware/auth.js';
import { COOKIE_SAME_SITE, COOKIE_SECURE, JWT_SECRET } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { isDatabaseUnavailableError, sendDatabaseUnavailable } from '../lib/database.js';

export const login = async (req: Request, res: Response) => {
    try{
        const {email, password} = req.body;
        if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
            return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
        }

        const user = await prisma.user.findUnique({where: {email: email.trim().toLowerCase()}});
        if(!user) return res.status(401).json({error: 'Email atau kata sandi tidak cocok.'});

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid) return res.status(401).json({error: 'Email atau kata sandi tidak cocok.'});

        const token = jwt.sign({id: user.id, role: user.role}, JWT_SECRET, {expiresIn: '1d'});
        const secure = COOKIE_SECURE ? '; Secure' : '';
        res.setHeader('Set-Cookie', `siakad_token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=${COOKIE_SAME_SITE}; Max-Age=86400${secure}`);
        res.json({message: 'Login berhasil!', role: user.role});
    } catch(error){
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'login');
            return;
        }
        res.status(500).json({error: 'Terjadi kesalahan saat login!'});
    }
};

export const logout = (_req: Request, res: Response) => {
    const secure = COOKIE_SECURE ? '; Secure' : '';
    res.setHeader('Set-Cookie', `siakad_token=; HttpOnly; Path=/; SameSite=${COOKIE_SAME_SITE}; Max-Age=0${secure}`);
    res.json({ message: 'Sesi ditutup.' });
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try{
        if(!req.user){
            return res.status(401).json({error: 'Tidak terautentikasi!'});
        }

        const activeYear = await prisma.tahunAjaran.findFirst({
            where: { aktif: true },
            select: { id: true }
        });
        const activeYearId = activeYear?.id || '';
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
                        mapel: true,
                        penugasanWali: {
                            where: { tahunAjaranId: activeYearId },
                            include: { kelas: true }
                        },
                        penugasanMapel: {
                            where: { tahunAjaranId: activeYearId },
                            include: { mapel: true, kelas: true }
                        }
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
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'mengambil profil pengguna');
            return;
        }
        res.status(500).json({error: 'Terjadi kesalahan saat mengambil data user!'});
    }
}
