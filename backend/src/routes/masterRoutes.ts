import { Router } from 'express';
import {
    createGuru, getGuru, updateGuru, deleteGuru,
    createSiswa, getSiswa, updateSiswa, deleteSiswa,
    createKelas, getKelas, updateKelas, deleteKelas,
    createMapel, getMapel, updateMapel, deleteMapel,
    getStats
} from '../controllers/masterController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/stats', requireRole(['ADMIN']), getStats);

// GURU
router.post('/guru', requireRole(['ADMIN']), createGuru);
router.get('/guru', requireRole(['ADMIN', 'GURU']), getGuru);
router.put('/guru/:id', requireRole(['ADMIN']), updateGuru);
router.delete('/guru/:id', requireRole(['ADMIN']), deleteGuru);

// SISWA
router.post('/siswa', requireRole(['ADMIN']), createSiswa);
router.get('/siswa', requireRole(['ADMIN', 'GURU']), getSiswa);
router.put('/siswa/:id', requireRole(['ADMIN']), updateSiswa);
router.delete('/siswa/:id', requireRole(['ADMIN']), deleteSiswa);

// KELAS
router.post('/kelas', requireRole(['ADMIN']), createKelas);
router.get('/kelas', requireRole(['ADMIN', 'GURU']), getKelas);
router.put('/kelas/:id', requireRole(['ADMIN']), updateKelas);
router.delete('/kelas/:id', requireRole(['ADMIN']), deleteKelas);

// MAPEL
router.post('/mapel', requireRole(['ADMIN']), createMapel);
router.get('/mapel', requireRole(['ADMIN', 'GURU']), getMapel);
router.put('/mapel/:id', requireRole(['ADMIN']), updateMapel);
router.delete('/mapel/:id', requireRole(['ADMIN']), deleteMapel);

export default router;