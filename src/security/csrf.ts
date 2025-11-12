import type { RequestHandler } from 'express';
import crypto from 'node:crypto';
import config from '../config';

declare global {
  // augment Express Request to carry the token we set
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

// Sets a readable cookie (NOT httpOnly) with a random CSRF value.
// SPA sends it back in header `x-csrf-token` for unsafe methods.
export const csrfSeed: RequestHandler = (req, res, next) => {
  const name = config.csrfCookieName;
  let token = req.cookies[name];
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie(name, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: config.isProd,
      domain: config.cookieDomain,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  }
  req.csrfToken = token;
  next();
};

export const requireCsrf: RequestHandler = (req, res, next) => {
  const cookie = req.cookies[config.csrfCookieName];
  const header = req.header('x-csrf-token');
  if (!cookie || !header || cookie !== header) {
    return res.status(403).json({ error: true, message: 'Invalid CSRF token' });
  }
  next();
};
