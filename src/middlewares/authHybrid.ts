import { Request, Response, NextFunction } from "express";
import { sessionLoader } from "../security/session";
import jwt from "jsonwebtoken";
import { redisClient } from "../db/redis";
import config from "../config";

export async function mobileAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Missing Bearer token" });
        }

        const token = auth.split(" ")[1];

        // verify JWT
        let payload: any;
        try {
            payload = jwt.verify(token, config.jwtSecret);
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // payload contains userId (we encoded earlier)
        if (!payload?.userId) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        // optionally: check if jti is blacklisted (logout)
        if (payload.jti) {
            const blacklisted = await redisClient.get(`mobile:bl:${payload.jti}`);
            if (blacklisted) {
                return res.status(401).json({ message: "Token revoked" });
            }
        }

        // inject into request
        (req as any).mobileUser = { userId: payload.userId };

        next();
    } catch (err) {
        console.error("mobileAuth error:", err);
        res.status(500).json({ message: "Internal auth error" });
    }
}

export async function authHybrid(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    // -----------------------------
    // 👇 MOBILE AUTH (JWT)
    // -----------------------------
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return mobileAuth(req, res, next); // must verify JWT
    }

    // -----------------------------
    // 👇 WEB AUTH (SESSION)
    // -----------------------------
    const session = (req as any).session;
    if (session?.userId) {

        // Only protect POST/PUT/PATCH/DELETE
        if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
            const token = req.headers["x-csrf-token"];
            if (!token || token !== req.csrfToken) {
                return res.status(403).json({ message: "Invalid CSRF token" });
            }
        }

        return next();
    }

    return res.status(401).json({ message: "Unauthenticated" });
}
