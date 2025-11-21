import { verifyAccessToken } from "./jwt";
import { getSession } from "./session";

import { Request, Response, NextFunction } from "express";

export async function authGuard(
    req: Request & { userId?: string },
    res: Response,
    next: NextFunction
) {
    // 1) Try Web Session
    const session = await getSession(req);
    if (session?.userId) {
        req.userId = session.userId;
        return next();
    }

    // 2) Try Mobile JWT
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
        const token = auth.substring(7);
        const payload = verifyAccessToken(token);
        if (payload?.userId) {
            req.userId = payload.userId;
            return next();
        }
    }

    return res.status(401).json({ message: "Unauthorized" });
}
