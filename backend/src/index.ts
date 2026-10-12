import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes.js';
import masterRoutes from './routes/masterRoutes.js';
import nilaiRoutes from './routes/nilaiRoutes.js';
import waliRoutes from './routes/waliRoutes.js';

const prisma = new PrismaClient();
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/nilai', nilaiRoutes);
app.use('/api/wali', waliRoutes);

app.get('/api/ping', async (req, res) => {
    try{
        const userCount = await prisma.user.count();
        res.json({
            message: 'Anjay!',
            totalUsers: userCount
        });
    } catch (error){
        res.status(500).json({error: 'Gagal terhubung ke neon!'});
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})