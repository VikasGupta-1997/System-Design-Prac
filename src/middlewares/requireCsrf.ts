import type { Request, Response, NextFunction } from "express";
import config from "../config";

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  // Skip safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const cookieToken = req.cookies[config.csrfCookieName];
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  next();
}
