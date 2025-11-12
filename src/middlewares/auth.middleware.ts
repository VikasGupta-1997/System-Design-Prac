import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../modules/auth/auth.service';
import User from '../db/postgres/models/auth.model';


export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const auth = req.headers.authorization;
        if (!auth) return res.status(401).json({ error: 'Missing auth header' });
        const token = auth.replace('Bearer ', '');
        const payload: any = await verifyToken(token);
        const user = await User.findByPk(payload.sub); // assuming sub = user.id
        if (!user) return res.status(401).json({ error: "Invalid user" });
        (req as any).user = user;
        next();
    } catch (err: any) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};