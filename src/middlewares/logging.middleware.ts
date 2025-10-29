import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();

    res.on('finish', () => {
        const duration = (performance.now() - start).toFixed(2);

        logger.info({
            trace_id: (req as any).traceId,
            method: req.method,
            url: req.originalUrl,
            status_code: res.statusCode,
            duration_ms: duration,
            user_agent: req.headers['user-agent']
        }, 'http_request_completed');
    });

    next();
};
