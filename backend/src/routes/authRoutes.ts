import {Router} from "express";
import {login, registerAdmin, register, getMe} from '../controllers/authController.js';
import {verifyToken} from '../middleware/auth.js';

const router = Router();

router.post('/register-admin', registerAdmin);
router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);

export default router;