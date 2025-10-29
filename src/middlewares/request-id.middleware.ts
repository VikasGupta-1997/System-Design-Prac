import { randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';

// AWS X-Ray style trace ID
const generateTraceId = () =>
    `Root=1-${Date.now().toString(16)}-${randomBytes(12).toString('hex')}`;

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const existingId = req.headers['x-request-id'] as string | undefined;
    const traceId = existingId || generateTraceId();

    (req as any).traceId = traceId;
    res.setHeader('X-Request-Id', traceId);

    next();
};
