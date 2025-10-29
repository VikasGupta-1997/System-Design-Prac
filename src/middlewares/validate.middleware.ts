// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const validateBody = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err: any) {
        return res.status(400).json({ error: err.errors || err.message });
    }
};
