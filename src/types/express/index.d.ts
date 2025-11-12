import * as express from 'express';

declare global {
    namespace Express {
        // Shape of authenticated user attached by your auth middleware
        interface User {
            id: string;
            email: string;
            role: 'user' | 'admin' | 'moderator' | string; // allow future roles
        }

        interface Request {
            traceId?: string;
            user?: User; // populated by JWT/auth middleware
        }
    }
}
