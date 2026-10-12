import { Router } from 'express';
import { 
  getKelasBinaan, 
  getRekapKelas, 
  saveCatatanRapor, 
  getLembarRaporSiswa 
} from '../controllers/waliController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

// Mendapatkan kelas binaan wali kelas atau daftar kelas untuk admin
router.get('/kelas-binaan', requireRole(['ADMIN', 'GURU']), getKelasBinaan);

// Rekapitulasi nilai & ranking kelas
router.get('/rekap', requireRole(['ADMIN', 'GURU']), getRekapKelas);

// Simpan / update catatan rapor siswa (kehadiran, sikap, ekskul, catatan wali)
router.post('/catatan', requireRole(['ADMIN', 'GURU']), saveCatatanRapor);

// Lembar rapor resmi siap cetak (bisa diakses admin, guru/wali, siswa, dan ortu)
router.get('/rapor/:siswaId', requireRole(['ADMIN', 'GURU', 'SISWA', 'ORTU']), getLembarRaporSiswa);

export default router;
