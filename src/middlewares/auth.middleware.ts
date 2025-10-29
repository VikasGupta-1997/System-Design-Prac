import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../modules/auth/auth.service';


export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const auth = req.headers.authorization;
        if (!auth) return res.status(401).json({ error: 'Missing auth header' });
        const token = auth.replace('Bearer ', '');
        const payload: any = await verifyToken(token);
        (req as any).userId = payload.sub;
        next();
    } catch (err: any) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};