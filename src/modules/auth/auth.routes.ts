import { Router } from 'express';
import { register, login, logout, getMe, refreshSession } from './auth.controller';
// import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema } from './auth.validation';
import { asyncWrapper } from '../../middlewares/asyncWrapper';

// import { requireCsrf } from '../../security/csrf';
import type { AuthedRequest } from '../../security/session';
import { sessionLoader } from '../../security/session';
// import { verifyPassword, hashPassword } from '../../security/password';
import { startOAuth, finishOAuth } from './oauth';

const router = Router();

// CSRF seed endpoint (SPA calls this once)
router.get('/csrf', (req, res) => {
    res.json({ csrfToken: req.csrfToken });
});
router.post('/register', validateBody(registerSchema), asyncWrapper(register));
router.post('/login', validateBody(loginSchema), asyncWrapper(login));
// router.get('/logout', authMiddleware, asyncWrapper(logout));
router.get('/logout', sessionLoader, asyncWrapper(logout));

// OAuth start/callback
router.get('/oauth/:provider', startOAuth);
router.get('/oauth/:provider/callback', finishOAuth);
router.post('/refresh', refreshSession);
router.get('/me', sessionLoader, asyncWrapper(getMe));


export default router;