import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { csrfSeed } from './security/csrf';
import { sessionLoader } from './security/session';
import { testPostgres, sequelize } from './db/postgres/connection';
import { connectMongo } from './db/mongo';
import config from './config';
import { testRedis } from './db/redis';
import authRoutes from './modules/auth/auth.routes';
import { errorHandler } from './middlewares/error.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { loggingMiddleware } from './middlewares/logging.middleware';

dotenv.config();
const app = express();
const version = 'v1';

// Middlewares
app.use(helmet());
app.use(requestIdMiddleware);
app.use(express.json());
app.use(cors({ origin: config.clientBaseUrl, credentials: true }));
app.use(cookieParser());
app.use(loggingMiddleware);

// CSRF + Session
app.use(csrfSeed);
app.use(sessionLoader);

// Routes
app.use(`/api/${version}/auth`, authRoutes);
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Error handler
app.use(errorHandler);

const PORT = config.port;

// small helper
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));


// ✅ Robust startup flow
const startServer = async () => {
    try {
        console.log("Starting backend…");

        // ----------------------------
        // ✅ Postgres — retry ONLY if first attempt fails
        // ----------------------------
        try {
            await testPostgres();
            console.log("Postgres connected on first attempt.");
        } catch (err) {
            console.log("Postgres first attempt failed. Retrying…");

            let attempts = 1;
            const maxAttempts = 10;

            while (attempts <= maxAttempts) {
                try {
                    await wait(3000);
                    await testPostgres();
                    console.log(`Postgres connected on retry ${attempts}.`);
                    break;
                } catch (e) {
                    attempts++;
                    console.log(`Postgres retry ${attempts}/${maxAttempts} failed…`);
                }
            }
        }

        // ----------------------------
        // ✅ Mongo — same pattern
        // ----------------------------
        try {
            await connectMongo();
            console.log("Mongo connected on first attempt.");
        } catch (err) {
            console.log("Mongo first attempt failed. Retrying…");

            let attempts = 1;
            const maxAttempts = 10;

            while (attempts <= maxAttempts) {
                try {
                    await wait(3000);
                    await connectMongo();
                    console.log(`Mongo connected on retry ${attempts}.`);
                    break;
                } catch (e) {
                    attempts++;
                    console.log(`Mongo retry ${attempts}/${maxAttempts} failed…`);
                }
            }
        }

        // ----------------------------
        // ✅ Redis — same pattern
        // ----------------------------
        try {
            await testRedis();
            console.log("Redis connected on first attempt.");
        } catch (err) {
            console.log("Redis first attempt failed. Retrying…");

            let attempts = 1;
            const maxAttempts = 10;

            while (attempts <= maxAttempts) {
                try {
                    await wait(3000);
                    await testRedis();
                    console.log(`Redis connected on retry ${attempts}.`);
                    break;
                } catch (e) {
                    attempts++;
                    console.log(`Redis retry ${attempts}/${maxAttempts} failed…`);
                }
            }
        }

        // ----------------------------
        // ✅ Start HTTP server
        // ----------------------------
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("Fatal startup error:", err);
        process.exit(1);
    }
};

startServer();
