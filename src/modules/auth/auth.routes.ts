import { Router } from 'express';
import { register, login, logout, getMe, refreshSession, updateBio } from './auth.controller';
// import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema } from './auth.validation';
import { asyncWrapper } from '../../middlewares/asyncWrapper';

// import { requireCsrf } from '../../security/csrf';
import type { AuthedRequest } from '../../security/session';
import { createSession, sessionLoader } from '../../security/session';
// import { verifyPassword, hashPassword } from '../../security/password';
import { startOAuth, finishOAuth } from './oauth';
import passport from "../../security/passport";
import config from '../../config';

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
// router.get('/oauth/:provider', startOAuth);
// router.get('/oauth/:provider/callback', finishOAuth);
//Passport Approach OAuth
// ---- Google OAuth ----
router.get("/oauth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/oauth/google/callback",
  passport.authenticate("google", { failureRedirect: `${config.clientBaseUrl}/login/user`, session: false }),
  asyncWrapper(async (req, res) => {
    const user = req.user as any;
    await createSession(res, { userId: user.id });
    res.redirect(`${config.clientBaseUrl}/auth/callback`);
  })
);
// ---- GitHub OAuth ----
router.get("/oauth/github", passport.authenticate("github", { scope: ["user:email"] }));

router.get(
  "/oauth/github/callback",
  passport.authenticate("github", { failureRedirect: `${config.clientBaseUrl}/login/user`, session: false }),
  asyncWrapper(async (req, res) => {
    const user = req.user as any;
    await createSession(res, { userId: user.id });
    res.redirect(`${config.clientBaseUrl}/auth/callback`);
  })
);

router.post('/refresh', asyncWrapper(refreshSession));
router.get('/me', asyncWrapper(getMe));
router.post('/update-bio', asyncWrapper(updateBio));

export default router;