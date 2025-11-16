// src/security/oidc.ts
import * as oidc from 'openid-client';
import { redisClient } from '../db/redis';
import config from '../config';

const { Issuer, generators } = oidc;

type OidcState = { codeVerifier: string; provider: 'google' | 'github' };

let googleClient: oidc.Client | null = null;
let githubClient: oidc.Client | null = null;

export async function initOidcClients() {
  // Google example (uses well-known discovery)
  const googleIssuer = await Issuer.discover('https://accounts.google.com');
  googleClient = new googleIssuer.Client({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uris: [`${config.serverBaseUrl}/api/v1/auth/oidc/google/callback`],
    response_types: ['code'],
  });
  console.log('OIDC: google client initialized');

  // GitHub - manually configure since it doesn't support OIDC discovery
  // GitHub uses OAuth 2.0, but we can use openid-client with manual issuer config
  const githubIssuer = new Issuer({
    issuer: 'https://github.com',
    authorization_endpoint: 'https://github.com/login/oauth/authorize',
    token_endpoint: 'https://github.com/login/oauth/access_token',
    userinfo_endpoint: 'https://api.github.com/user',
    jwks_uri: 'https://token.actions.githubusercontent.com/.well-known/jwks', // GitHub Actions OIDC JWKS
  });
  
  githubClient = new githubIssuer.Client({
    client_id: config.githubClientId,
    client_secret: config.githubClientSecret,
    redirect_uris: [`${config.serverBaseUrl}/api/v1/auth/oidc/github/callback`],
    response_types: ['code'],
  });
  console.log('OIDC: github client initialized');
}

export function getGoogleClient() {
  if (!googleClient) throw new Error('Google OIDC client not initialized');
  return googleClient;
}

export function getGitHubClient() {
  if (!githubClient) throw new Error('GitHub OIDC client not initialized');
  return githubClient;
}

export async function createOidcState(provider: 'google' | 'github') {
  const state = generators.state();
  const codeVerifier = generators.codeVerifier();
  // store state -> codeVerifier in redis for 10 minutes
  await redisClient.set(`oidc_state:${state}`, JSON.stringify({ codeVerifier, provider }), 'EX', 600);
  return { state, codeVerifier };
}

export async function consumeOidcState(state: string): Promise<OidcState | null> {
  const raw = await redisClient.get(`oidc_state:${state}`);
  if (!raw) return null;
  await redisClient.del(`oidc_state:${state}`);
  return JSON.parse(raw) as OidcState;
}
