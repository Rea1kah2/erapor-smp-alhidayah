import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import masterRoutes from './routes/masterRoutes.js';
import nilaiRoutes from './routes/nilaiRoutes.js';
import waliRoutes from './routes/waliRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ortuRoutes from './routes/ortuRoutes.js';
import { prisma } from './lib/prisma.js';
import { isDatabaseUnavailableError, sendDatabaseUnavailable } from './lib/database.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const origin = req.headers.origin;
        if (origin && !allowedOrigins.includes(origin)) {
            return res.status(403).json({ error: 'Origin tidak diizinkan.' });
        }
    }
    next();
});
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/nilai', nilaiRoutes);
app.use('/api/wali', waliRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ortu', ortuRoutes);

app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    if (isDatabaseUnavailableError(error)) {
        sendDatabaseUnavailable(res, error, `${req.method} ${req.path}`);
        return;
    }
    console.error(`Unhandled API error on ${req.method} ${req.path}:`, error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.' });
});

app.get('/api/health/live', (_req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/health/ready', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ready' });
    } catch (error) {
        sendDatabaseUnavailable(res, error, 'readiness check');
    }
});

app.get('/api/ping', async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        res.json({
            status: 'ok',
            message: 'Layanan API E-Rapor SMP Al-Hidayah aktif',
            totalUsers: userCount
        });
    } catch (error){
        if (isDatabaseUnavailableError(error)) {
            sendDatabaseUnavailable(res, error, 'ping');
            return;
        }
        res.status(500).json({error: 'Gagal memeriksa koneksi database.'});
    }
});

const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

const shutdown = async (signal: string) => {
    console.log(`Received ${signal}; shutting down gracefully.`);
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
};

process.once('SIGINT', () => { void shutdown('SIGINT'); });
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
