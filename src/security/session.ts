import crypto from 'node:crypto';
import { redisClient } from '../db/redis';
import  config  from '../config';
import type { Request, Response, NextFunction } from 'express';

type SessionData = {
  userId: string;
  // you can store role, 2FA status, etc.
};

const prefix = 'sess:';
const refreshPrefix = "refresh:";

export async function createSession(res: Response, data: SessionData) {
  const sid = crypto.randomBytes(24).toString('hex');
  const rid = crypto.randomBytes(32).toString("hex");
  const key = `${prefix}${sid}`;
  const refreshKey = `${refreshPrefix}${rid}`;
  await redisClient.set(key, JSON.stringify(data), 'EX', config.sessionTtlSec);
  // long-lived refresh session (30 days)
  await redisClient.set(refreshKey, JSON.stringify({ ...data, sid }), "EX", 2592000);
  res.cookie(config.sessionCookieName, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    domain: config.cookieDomain,
    maxAge: config.sessionTtlSec * 1000,
  });

  res.cookie("refresh_token", rid, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    domain: config.cookieDomain,
    maxAge: 2592000 * 1000, // 30 days
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
  const rid = req.cookies["refresh_token"];
  if (sid) await redisClient.del(`${prefix}${sid}`);
  if (rid) await redisClient.del(`${refreshPrefix}${rid}`);
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    domain: config.cookieDomain,
  });
  res.clearCookie("refresh_token");
}

// Middleware to load session into req
export async function sessionLoader(req: Request, _res: Response, next: NextFunction) {
  (req as any).session = await getSession(req);
  next();
}

export type AuthedRequest = Request & { session?: SessionData | null };
