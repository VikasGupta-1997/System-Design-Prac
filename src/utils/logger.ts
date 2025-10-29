// src/utils/logger.ts
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logFile = path.join(LOG_DIR, 'app.log');

const streams = [
    // pretty print on stdout (only in non-production)
    ...(process.env.NODE_ENV === 'production'
        ? []
        : [{ level: 'debug', stream: pinoPretty({ colorize: true }) }]),
    // file stream (json) for production ingestion
    { level: process.env.LOG_LEVEL || 'info', stream: pino.destination(logFile) },
];

// const logger = pino(
//     {
//         level: process.env.LOG_LEVEL || 'info',
//         base: { pid: process.pid },
//         timestamp: pino.stdTimeFunctions.isoTime,
//     },
//     pino.multistream(streams as any)
// );

const logger = pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard'
        }
    }
});

export default logger;
