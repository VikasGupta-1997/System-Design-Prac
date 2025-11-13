import { Router } from 'express';
import { register, login, logout } from './auth.controller';
// import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema } from './auth.validation';
import { asyncWrapper } from '../../middlewares/asyncWrapper';

// import { requireCsrf } from '../../security/csrf';
import type { AuthedRequest } from '../../security/session';
import { sessionLoader } from '../../security/session';
// import { verifyPassword, hashPassword } from '../../security/password';
import { startOAuth, finishOAuth } from './oauth';
import { Request, Response } from 'express';

const router = Router();
router.post('/register', validateBody(registerSchema), asyncWrapper(register));
router.post('/login', validateBody(loginSchema), asyncWrapper(login));
// router.get('/logout', authMiddleware, asyncWrapper(logout));
router.get('/logout', sessionLoader, asyncWrapper(logout));

// CSRF seed endpoint (SPA calls this once)
router.get('/csrf', (req, res) => {
    res.json({ csrfToken: req.csrfToken });
});

// OAuth start/callback
router.get('/oauth/:provider', startOAuth);
router.get('/oauth/:provider/callback', finishOAuth);

// Session check
const getMe = async (req: Request, res: Response) => {
    const authedReq = req as AuthedRequest;
    if (!authedReq.session?.userId) return res.status(401).json({ message: 'Unauthenticated' });
    res.json({ userId: authedReq.session.userId });
};
router.get('/me', sessionLoader, asyncWrapper(getMe));


export default router;