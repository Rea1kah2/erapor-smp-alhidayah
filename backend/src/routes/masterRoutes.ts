import { Router } from 'express';
import {
    createGuru, getGuru, updateGuru, deleteGuru,
    createSiswa, getSiswa, updateSiswa, deleteSiswa,
    createKelas, getKelas, updateKelas, deleteKelas,
    createMapel, getMapel, updateMapel, deleteMapel,
    getStats, getTahunAjaran, createTahunAjaran, setTahunAjaranAktif,
    getPenugasan, setPenugasanMapel, setPenugasanWali, assignSiswaToClass,
    createOrtu
} from '../controllers/masterController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/stats', requireRole(['ADMIN']), getStats);
router.get('/tahun-ajaran', requireRole(['ADMIN', 'GURU_MAPEL', 'GURU_WALI', 'GURU', 'SISWA', 'ORTU']), getTahunAjaran);
router.post('/tahun-ajaran', requireRole(['ADMIN']), createTahunAjaran);
router.put('/tahun-ajaran/:id/aktif', requireRole(['ADMIN']), setTahunAjaranAktif);
router.get('/penugasan', requireRole(['ADMIN']), getPenugasan);
router.post('/penugasan/mapel', requireRole(['ADMIN']), setPenugasanMapel);
router.post('/penugasan/wali', requireRole(['ADMIN']), setPenugasanWali);
router.post('/siswa/:id/kelas', requireRole(['ADMIN']), assignSiswaToClass);
router.post('/ortu', requireRole(['ADMIN']), createOrtu);

// GURU
router.post('/guru', requireRole(['ADMIN']), createGuru);
router.get('/guru', requireRole(['ADMIN']), getGuru);
router.put('/guru/:id', requireRole(['ADMIN']), updateGuru);
router.delete('/guru/:id', requireRole(['ADMIN']), deleteGuru);

// SISWA
router.post('/siswa', requireRole(['ADMIN']), createSiswa);
router.get('/siswa', requireRole(['ADMIN', 'GURU_MAPEL', 'GURU_WALI', 'GURU']), getSiswa);
router.put('/siswa/:id', requireRole(['ADMIN']), updateSiswa);
router.delete('/siswa/:id', requireRole(['ADMIN']), deleteSiswa);

// KELAS
router.post('/kelas', requireRole(['ADMIN']), createKelas);
router.get('/kelas', requireRole(['ADMIN', 'GURU_MAPEL', 'GURU_WALI', 'GURU']), getKelas);
router.put('/kelas/:id', requireRole(['ADMIN']), updateKelas);
router.delete('/kelas/:id', requireRole(['ADMIN']), deleteKelas);

// MAPEL
router.post('/mapel', requireRole(['ADMIN']), createMapel);
router.get('/mapel', requireRole(['ADMIN', 'GURU_MAPEL', 'GURU_WALI', 'GURU']), getMapel);
router.put('/mapel/:id', requireRole(['ADMIN']), updateMapel);
router.delete('/mapel/:id', requireRole(['ADMIN']), deleteMapel);

export default router;
