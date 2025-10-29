import { Router } from 'express';
import { register, login, logout } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema } from './auth.validation';
import { asyncWrapper } from '../../middlewares/asyncWrapper';

const router = Router();
router.post('/register', validateBody(registerSchema), asyncWrapper(register));
router.post('/login', validateBody(loginSchema), asyncWrapper(login));
router.get('/logout', authMiddleware, asyncWrapper(logout));


export default router;