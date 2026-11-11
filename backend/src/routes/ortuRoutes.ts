import { Router } from 'express';
import { getAnakSaya, updateCatatanOrtu } from '../controllers/ortuController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole(['ORTU']));

// Rute untuk orang tua
router.get('/anak', getAnakSaya);
router.patch('/catatan/:siswaId', updateCatatanOrtu);

export default router;
