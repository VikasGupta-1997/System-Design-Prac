// src/modules/auth/oidc.routes.ts
import { Router } from 'express';
import { getGoogleClient, getGitHubClient, createOidcState, consumeOidcState } from '../../security/oidcv5';
import config from '../../config';
import { User } from '../../db/postgres/models/auth.model';
import { Account } from '../../db/postgres/models/account.model';
import crypto from 'crypto';
import { createSession } from '../../security/session';
import fetch from 'node-fetch';

const router = Router();

function calculateCodeChallenge(verifier: string) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

// Start Google login
router.get('/google', async (req, res) => {
  try {
    console.log("Initiliazed !!!")
    const client = getGoogleClient();
    const { state, codeVerifier } = await createOidcState('google');

    const codeChallenge = calculateCodeChallenge(codeVerifier);
    // openid-client exposes helpers; if not available use generators in oidc.ts

    const url = client.authorizationUrl({
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent', // to get refresh token on first consent
    });
    console.group("URLLL", url)
    res.redirect(url);
  } catch (err) {
    console.error('OIDC start error', err);
    res.status(500).send('OIDC start failed');
  }
});

// Callback: exchange code -> tokens -> userinfo -> upsert -> create session
router.get('/google/callback', async (req, res) => {
  try {
    const client = getGoogleClient();
    const params = client.callbackParams(req); // parses query/POST
    const state = (params.state as string) || '';
    const stateData = await consumeOidcState(state);
    if (!stateData) return res.status(400).send('Invalid state');

    const tokenSet = await client.callback(
      `${config.serverBaseUrl}/api/v1/auth/oidc/google/callback`,
      params,
      { code_verifier: stateData.codeVerifier, state }
    );

    // tokenSet contains access_token, refresh_token, id_token
    // get userinfo
    const userinfo = await client.userinfo(tokenSet.access_token as string);

    const email = userinfo.email;
    const providerAccountId = userinfo.sub || userinfo.sub?.toString();
    const name = userinfo.name || userinfo.given_name || email?.split('@')[0];

    if (!email) return res.status(400).send('Email not provided by provider');

    // Upsert user
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        email,
        username: name || email.split('@')[0],
        password_hash: crypto.randomBytes(16).toString('hex'), // placeholder
        role: 'user',
      } as any);
    }

    // Find or create account and store tokens
    let account = await Account.findOne({ where: { userId: user.id, provider: 'google' } });
    if (!account) {
      account = await Account.create({
        userId: user.id,
        provider: 'google',
        providerAccountId,
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
      });
    } else {
      await account.update({
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        providerAccountId,
      });
    }

    // create your own session (cookie + redis) — unchanged
    await createSession(res, { userId: user.id });

    // redirect SPA
    res.redirect(`${config.clientBaseUrl}/auth/callback`);
  } catch (err: any) {
    console.error('OIDC callback error', err);
    res.status(500).send('OIDC callback failed');
  }
});

// Start GitHub login
router.get('/github', async (req, res) => {
  try {
    console.log("GitHub OIDC initialized");
    const client = getGitHubClient();
    const { state, codeVerifier } = await createOidcState('github');

    const codeChallenge = calculateCodeChallenge(codeVerifier);

    const url = client.authorizationUrl({
      scope: 'read:user user:email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    res.redirect(url);
  } catch (err) {
    console.error('GitHub OIDC start error', err);
    res.status(500).send('GitHub OIDC start failed');
  }
});

// Callback: exchange code -> tokens -> userinfo -> upsert -> create session
router.get('/github/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const stateData = await consumeOidcState(state);
    if (!stateData) return res.status(400).send('Invalid state');

    // GitHub doesn't return id_token (it's OAuth 2.0, not OIDC)
    // So we manually exchange the code for tokens
    const tokenParams = new URLSearchParams({
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      grant_type: 'authorization_code',
      redirect_uri: `${config.serverBaseUrl}/api/v1/auth/oidc/github/callback`,
      code_verifier: stateData.codeVerifier,
      code,
    });

    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResp.ok) {
      const errorText = await tokenResp.text();
      console.error('GitHub token exchange failed:', errorText);
      return res.status(400).send('Token exchange failed');
    }

    const tokenSet: any = await tokenResp.json();
    console.log("GitHub tokenSet:", { 
      hasAccessToken: !!tokenSet.access_token, 
      hasRefreshToken: !!tokenSet.refresh_token,
      keys: Object.keys(tokenSet)
    });

    // Note: GitHub OAuth Apps do NOT provide refresh tokens
    // Access tokens don't expire unless revoked, so refresh tokens aren't needed
    // Only GitHub Apps (different app type) provide refresh tokens

    // GitHub doesn't have a standard userinfo endpoint, so we fetch from GitHub API
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 
        Authorization: `Bearer ${tokenSet.access_token}`,
        'User-Agent': 'Instagram-App',
        Accept: 'application/vnd.github.v3+json',
      },
    });
    const userData: any = await userRes.json();

    // Get user emails
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: { 
        Authorization: `Bearer ${tokenSet.access_token}`,
        'User-Agent': 'Instagram-App',
        Accept: 'application/vnd.github.v3+json',
      },
    });
    const emails = (await emailsRes.json()) as any[];
    
    // Find primary verified email
    const primaryEmail = emails.find((e) => e.primary && e.verified) ||
      emails.find((e) => e.verified) ||
      emails[0];
    
    const email = primaryEmail?.email || userData.email;
    const providerAccountId = String(userData.id);
    const name = userData.name || userData.login || email?.split('@')[0];

    if (!email) return res.status(400).send('Email not provided by provider');

    // Upsert user
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        email,
        username: name || email.split('@')[0],
        password_hash: crypto.randomBytes(16).toString('hex'), // placeholder
        role: 'user',
      } as any);
    }

    // Find or create account and store tokens
    // Note: GitHub OAuth apps don't provide refresh tokens (only GitHub Apps do)
    let account = await Account.findOne({ where: { userId: user.id, provider: 'github' } });
    console.log("tokenSettokenSet", tokenSet)
    if (!account) {
      account = await Account.create({
        userId: user.id,
        provider: 'github',
        providerAccountId,
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token || null, // GitHub OAuth apps don't provide refresh tokens
      });
    } else {
      await account.update({
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token || account.refreshToken, // Preserve existing if new one is null
        providerAccountId,
      });
    }

    // create your own session (cookie + redis) — unchanged
    await createSession(res, { userId: user.id });

    // redirect SPA
    res.redirect(`${config.clientBaseUrl}/auth/callback`);
  } catch (err: any) {
    console.error('GitHub OIDC callback error', err);
    res.status(500).send('GitHub OIDC callback failed');
  }
});

export default router;
