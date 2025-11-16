// src/security/oidc.ts
import { 
  discovery, 
  randomPKCECodeVerifier, 
  randomState, 
  calculatePKCECodeChallenge,
  type Configuration 
} from 'openid-client';
import { ClientSecretPost } from 'openid-client';
import { redisClient } from '../db/redis';
import config from '../config';

type OidcState = { codeVerifier: string; provider: 'google' | 'github' };

let googleConfig: Configuration | null = null;
// you can add other providers similarly

export async function initOidcClients() {
  // Google example (uses well-known discovery)
  googleConfig = await discovery(
    new URL('https://accounts.google.com'),
    config.googleClientId,
    {
      redirect_uris: [`${config.serverBaseUrl}/api/v1/auth/oidc/google/callback`],
      response_types: ['code'],
    },
    ClientSecretPost(config.googleClientSecret)
  );
  console.log('OIDC: google client initialized');
}

export function getGoogleConfig() {
  if (!googleConfig) throw new Error('Google OIDC client not initialized');
  return googleConfig;
}

export async function createOidcState(provider: 'google' | 'github') {
  const state = randomState();
  const codeVerifier = randomPKCECodeVerifier();
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

export { calculatePKCECodeChallenge };
