import crypto from 'node:crypto';
import { redisClient } from '../db/redis';
import  config  from '../config';
import type { Request, Response, NextFunction } from 'express';

type SessionData = {
  userId: string;
  // you can store role, 2FA status, etc.
};

const prefix = 'sess:';

export async function createSession(res: Response, data: SessionData) {
  const sid = crypto.randomBytes(24).toString('hex');
  const key = `${prefix}${sid}`;
  await redisClient.set(key, JSON.stringify(data), 'EX', config.sessionTtlSec);
  res.cookie(config.sessionCookieName, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    domain: config.cookieDomain,
    maxAge: config.sessionTtlSec * 1000,
  });
}

export async function getSession(req: Request): Promise<SessionData | null> {
  const sid = req.cookies[config.sessionCookieName];
  if (!sid) return null;
  const raw = await redisClient.get(`${prefix}${sid}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession(req: Request, res: Response) {
  const sid = req.cookies[config.sessionCookieName];
  if (sid) await redisClient.del(`${prefix}${sid}`);
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    domain: config.cookieDomain,
  });
}

// Middleware to load session into req
export async function sessionLoader(req: Request, _res: Response, next: NextFunction) {
  (req as any).session = await getSession(req);
  console.log("REDDD", req.session)
  next();
}

export type AuthedRequest = Request & { session?: SessionData | null };
