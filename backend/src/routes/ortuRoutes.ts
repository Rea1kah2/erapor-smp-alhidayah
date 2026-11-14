import { Router } from 'express';
import { getAnakSaya, updateCatatanOrtu } from '../controllers/ortuController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

// Rute untuk orang tua (ADMIN juga diizinkan mengelola catatan orang tua dari pratinjau rapor)
router.get('/anak', requireRole(['ORTU']), getAnakSaya);
router.patch('/catatan/:siswaId', requireRole(['ORTU', 'ADMIN']), updateCatatanOrtu);

export default router;
