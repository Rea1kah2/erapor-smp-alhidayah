import { type Request, type Response, type NextFunction} from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from '../config/env.js';

export const ROLES = {
    ADMIN: 'ADMIN',
    GURU_MAPEL: 'GURU_MAPEL',
    GURU_WALI: 'GURU_WALI',
    SISWA: 'SISWA',
    ORTU: 'ORTU',
    // Fallback legacy support
    GURU: 'GURU'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const cookieToken = req.headers.cookie
        ?.split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('siakad_token='))
        ?.slice('siakad_token='.length);
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = cookieToken || bearerToken;

    if(!token){
        return res.status(401).json({error: 'Akses ditolak, token tak ditemukan!'});
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if(err){
           return res.status(403).json({error: 'Token tak valid atau sudah kedaluwarsa!'}); 
        }
        req.user = user as {id: string, role: string};
        next();
    });
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if(!req.user || !roles.includes(req.user.role)){
            return res.status(403).json({error: 'Anda tak punya izin untuk mengakses resource ini!'});
        }
        next();
    };
};

