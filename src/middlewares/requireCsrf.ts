import type { Request, Response, NextFunction } from "express";
import config from "../config";

export function requireCsrf(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const sessionId = req.cookies[config.sessionCookieName];
    const hasSessionCookie = Boolean(sessionId);

    // Mobile clients use JWT → skip CSRF entirely
    const authHeader = req.headers.authorization;
    const isMobile = authHeader && authHeader.startsWith("Bearer ");

    // 🔥 Skip CSRF for mobile auth endpoints
    if (req.path.startsWith("/api/v1/auth/mobile")) {
        return next();
    }

    if (isMobile) return next(); // 🔥 mobile bypass

    if (!hasSessionCookie) {
        // Web user not logged in → nothing to protect
        return next();
    }

    // CSRF applies ONLY to state-changing requests
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }

    const token = req.headers["x-csrf-token"];
    if (!token || token !== req.csrfToken) {
        return res.status(403).json({ message: "Invalid CSRF token" });
    }

    next();
}
