import { Router } from 'express';
import {
    getAdminUsers,
    registerSiswa,
    registerGuruMapel,
    registerGuruWali,
    registerOrtu,
    resetUserPassword,
    deleteUser
} from '../controllers/adminController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole(['ADMIN']));

// User management endpoints
router.get('/users', getAdminUsers);
router.post('/register/siswa', registerSiswa);
router.post('/register/guru-mapel', registerGuruMapel);
router.post('/register/guru-wali', registerGuruWali);
router.post('/register/ortu', registerOrtu);
router.patch('/users/:id/reset-password', resetUserPassword);
router.put('/users/:id/reset-password', resetUserPassword);
router.delete('/users/:id', deleteUser);

export default router;
