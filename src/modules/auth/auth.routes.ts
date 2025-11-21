import { Router } from 'express';
import { register, login, logout, getMe, refreshSession, updateBio, mobileLogin } from './auth.controller';
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
import { keycloakClient } from '../../security/keycloak';
import { generators } from 'openid-client';
import { redisClient } from '../../db/redis';
import { consumeMobileRefreshToken, createMobileRefreshToken, signAccessToken } from '../../security/jwt';
import { authHybrid } from '../../middlewares/authHybrid'
import { getGitHubClient, getGoogleClient } from '../../security/oidcv5';

const router = Router();

// CSRF seed endpoint (SPA calls this once)
router.get('/csrf', (req, res) => {
    res.json({ csrfToken: req.csrfToken });
});
router.post('/register', validateBody(registerSchema), asyncWrapper(register));
router.post('/login', validateBody(loginSchema), asyncWrapper(login));
router.post("/mobile/login", validateBody(loginSchema), asyncWrapper(mobileLogin));
router.post("/mobile/refresh", asyncWrapper(async (req, res) => {
    const { refreshToken } = req.body;

    const data = await consumeMobileRefreshToken(refreshToken);
    if (!data) return res.status(401).json({ error: "Invalid refresh token" });

    const accessToken = signAccessToken({ userId: data.userId });
    const newRefresh = await createMobileRefreshToken(data.userId);

    res.json({
        accessToken,
        refreshToken: newRefresh,
    });
}));

router.post("/mobile/logout", asyncWrapper(async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        await redisClient.del(`mobile_refresh:${refreshToken}`);
    }
    res.json({ ok: true });
}));

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

/** Mobile google and github login */
// ---- GOOGLE MOBILE LOGIN ----
router.post("/mobile/oauth/google", async (req, res) => {
    const { code, codeVerifier, redirectUri } = req.body;

    const google = getGoogleClient();

    const tokenSet = await google.callback(redirectUri, {
        code,
        code_verifier: codeVerifier,
    });

    const userInfo = await google.userinfo(tokenSet.access_token!);

    const accessToken = signAccessToken({ userId: userInfo.sub });
    const refreshToken = await createMobileRefreshToken(userInfo.sub);

    res.json({ accessToken, refreshToken });
});

// ---- GITHUB MOBILE LOGIN ----
router.post("/mobile/oauth/github", async (req, res) => {
    const { code, codeVerifier, redirectUri } = req.body;

    const github = getGitHubClient();

    const tokenSet = await github.callback(redirectUri, {
        code,
        code_verifier: codeVerifier,
    });

    const userInfo = await github.userinfo(tokenSet.access_token!);

    const accessToken = signAccessToken({ userId: userInfo.sub });
    const refreshToken = await createMobileRefreshToken(userInfo.sub);

    res.json({ accessToken, refreshToken });
});
/** Ends Here */

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
router.get('/me', authHybrid, asyncWrapper(getMe));
router.post('/update-bio', authHybrid, asyncWrapper(updateBio));

// Step 1: Redirect frontend to Keycloak
router.get("/keycloak/login", async (req, res) => {
    console.log("GOT INTO KEYCLOKCKCKCK");

    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);
    const state = generators.state();

    // Store PKCE code_verifier in redis
    await redisClient.set(
        `kc:pkce:${state}`,
        code_verifier,
        "EX",
        600 // 10 min
    );

    const url = keycloakClient.authorizationUrl({
        scope: "openid profile email",
        code_challenge,
        code_challenge_method: "S256",
        state,
    });

    res.json({ loginUrl: url });
});


router.post("/keycloak/callback", async (req, res) => {
    console.log("EREERere")
    const { code, state } = req.body;

    if (!code || !state)
        return res.status(400).json({ error: "Missing code or state" });

    const code_verifier = await redisClient.get(`kc:pkce:${state}`);

    if (!code_verifier) {
        return res.status(400).json({ error: "Invalid or expired PKCE state" });
    }

    // exchange code for tokens
    const tokenSet = await keycloakClient.callback(
        "http://localhost:8000/api/v1/auth/keycloak/callback",
        { code, state },
        { code_verifier }
    );

    const userInfo = await keycloakClient.userinfo(tokenSet.access_token!);

    // store refresh token in redis
    const sid = `sess:${tokenSet.refresh_token}`;
    await redisClient.set(
        sid,
        JSON.stringify({ userId: userInfo.sub }),
        "EX",
        60 * 60 * 24 * 30
    );

    // create short session cookie (your old code)
    await createSession(res, { userId: userInfo.sub });

    res.json({ ok: true, user: userInfo });
});


export default router;