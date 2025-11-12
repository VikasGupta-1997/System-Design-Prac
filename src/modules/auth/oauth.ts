import crypto from 'node:crypto';
import type { Response, Request } from 'express';
import config from '../../config';
import { redisClient } from '../../db/redis';
import fetch from 'node-fetch';
import { User } from '../../db/postgres/models/auth.model';         // your existing model
import { Account } from '../../db/postgres/models/account.model';   // your existing Account model

type Provider = 'google' | 'github';

const GOOGLE = {
    authz: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
};
const GITHUB = {
    authz: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    me: 'https://api.github.com/user',
    emails: 'https://api.github.com/user/emails',
    scope: 'read:user user:email',
};

function serverOrigin(req: Request) {
    const xfproto = req.headers['x-forwarded-proto'] as string | undefined;
    const xfhost = req.headers['x-forwarded-host'] as string | undefined;
    return xfproto && xfhost ? `${xfproto}://${xfhost}` : `${req.protocol}://${req.get('host')}`;
}

function providerConfig(p: Provider) {
    if (p === 'google') {
        return {
            authz: GOOGLE.authz, token: GOOGLE.token, scope: GOOGLE.scope,
            clientId: config.googleClientId, clientSecret: config.googleClientSecret,
        };
    }
    return {
        authz: GITHUB.authz, token: GITHUB.token, scope: GITHUB.scope,
        clientId: config.githubClientId, clientSecret: config.githubClientSecret,
    };
}

// Save transient OAuth state+PKCE in Redis under a short-lived key
async function saveOAuthState(nonce: string, data: any) {
    await redisClient.set(`oauth:${nonce}`, JSON.stringify(data), 'EX', 600);
}
async function readOAuthState(nonce: string) {
    const raw = await redisClient.get(`oauth:${nonce}`);
    return raw ? JSON.parse(raw) : null;
}
async function delOAuthState(nonce: string) {
    await redisClient.del(`oauth:${nonce}`);
}

export async function startOAuth(req: Request, res: Response) {
    const provider = req.params.provider as Provider;
    if (!['google', 'github'].includes(provider)) {
        return res.status(400).json({ message: 'Unknown provider' });
    }

    const { clientId, scope } = providerConfig(provider);
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const nonce = crypto.randomBytes(16).toString('hex'); // key to look up state in Redis

    const redirectUri = `${serverOrigin(req)}/api/v1/auth/oauth/${provider}/callback`;

    // 🧠 DEBUG LOGS
    console.log('=== [OAuth DEBUG] Starting OAuth Flow ===');
    console.log('Provider:', provider);
    console.log('Client ID:', clientId);
    console.log('Server Origin:', serverOrigin(req));
    console.log('Redirect URI (will be sent to Google):', redirectUri);
    console.log('Full expected redirect to Google:');
    console.log(`  ${provider.toUpperCase()} AUTH URL: ${provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://github.com/login/oauth/authorize'}`);
    console.log('=========================================');
    await saveOAuthState(nonce, { provider, state, codeVerifier, redirectUri });

    // we pass `nonce` via cookie so callback can find state in Redis
    res.cookie('oauth_nonce', nonce, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
        domain: config.cookieDomain,
        maxAge: 10 * 60 * 1000,
    });

    const authz = provider === 'google' ? GOOGLE.authz : GITHUB.authz;
    const url = new URL(authz);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    if (provider === 'google') url.searchParams.set('access_type', 'offline');

    // 🔍 Log final redirect URL to verify parameters
    console.log('Final Redirect to Provider:', url.toString());
    console.log('=========================================');

    res.redirect(url.toString());
}

export async function finishOAuth(req: Request, res: Response) {
    const provider = req.params.provider as 'google' | 'github';
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');

    const nonce = req.cookies['oauth_nonce'];
    if (!nonce) return res.status(400).send('Missing oauth nonce');

    const st = await readOAuthState(nonce);
    if (!st || st.provider !== provider || st.state !== state) {
        return res.status(400).send('Invalid OAuth state');
    }

    // Clean up Redis + cookie
    await delOAuthState(nonce);
    res.clearCookie('oauth_nonce', {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
        domain: config.cookieDomain,
    });

    // Exchange code for tokens
    const { clientId, clientSecret } = providerConfig(provider);
    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: st.redirectUri,
        code_verifier: st.codeVerifier,
        code,
    });

    const tokenEndpoint = provider === 'google' ? GOOGLE.token : GITHUB.token;
    const tokenResp = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        },
        body: params.toString(),
    });

    if (!tokenResp.ok) {
        console.error(await tokenResp.text());
        return res.status(400).send('Token exchange failed');
    }

    const tokens: any = await tokenResp.json();

    // Retrieve user info
    let email: string | null = null;
    let name: string | null = null;
    let providerAccountId: string = '';

    if (provider === 'google') {
        const ui = await fetch(GOOGLE.userinfo, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile: any = await ui.json();
        email = profile.email || null;
        name = profile.name || profile.given_name || null;
        providerAccountId = profile.sub;
    } else {
        const up = await fetch(GITHUB.me, {
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'app' },
        });
        const u: any = await up.json();
        providerAccountId = String(u.id);
        name = u.name || u.login || null;

        const em = await fetch(GITHUB.emails, {
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'app' },
        });
        const emails = (await em.json()) as any[];
        const primary = emails.find((e) => e.primary && e.verified) ||
            emails.find((e) => e.verified) ||
            emails[0];
        email = primary?.email ?? null;
    }

    if (!email) return res.status(400).send('Email not available from provider');

    // --- ✅ Upsert logic (fixes duplicate Account issue) ---
    let user = await User.findOne({ where: { email } });
    if (!user) {
        user = await User.create({
            email,
            username: name ?? email.split('@')[0],
            password_hash: crypto.randomBytes(16).toString('hex'),
            role: 'user',
        } as any);
    }

    // Find or update Account for this provider/user
    let account = await Account.findOne({
        where: { userId: user.id, provider },
    });

    if (!account) {
        account = await Account.create({
            userId: user.id,
            provider,
            providerAccountId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
        });
    } else {
        await account.update({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            providerAccountId, // in case provider changes internal ID
        });
    }

    // --- ✅ Create new session (cookie + Redis) ---
    const { createSession } = await import('../../security/session');
    await createSession(res, { userId: user.id });

    // Redirect back to SPA
    const url = new URL('/auth/callback', config.clientBaseUrl);
    res.redirect(url.toString());
}
