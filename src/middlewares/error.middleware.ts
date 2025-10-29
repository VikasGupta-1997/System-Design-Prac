import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logger.error({
        trace_id: (req as any).traceId,
        message: err.message,
        stack: err.stack,
    }, 'unhandled_error');

    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        trace_id: (req as any).traceId
    });
};
