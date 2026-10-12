import { Router } from 'express';
import { upsertNilai, getNilaiByMapel, getNilaiSaya } from '../controllers/nilaiController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

// Untuk Siswa & Orang Tua melihat nilai/rapor
router.get('/saya', requireRole(['SISWA', 'ORTU']), getNilaiSaya);

// Untuk Admin & Guru menginput dan melihat rekap nilai
router.post('/', requireRole(['ADMIN', 'GURU']), upsertNilai);
router.get('/mapel', requireRole(['ADMIN', 'GURU']), getNilaiByMapel);

export default router;