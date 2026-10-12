import { type Request, type Response, type NextFunction} from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'siakad_super_secret_key';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

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

