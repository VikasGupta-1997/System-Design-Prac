import express from 'express';
import dotenv from 'dotenv';
import { testPostgres, sequelize } from './db/postgres';
import { connectMongo } from './db/mongo';
import config from './config';
import { testRedis } from './db/redis';
import authRoutes from './modules/auth/auth.routes';
import logger from './utils/logger';
import { errorHandler } from './middlewares/error.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { loggingMiddleware } from './middlewares/logging.middleware';
// import feedRoutes from './modules/feed/feed.routes';

const version = 'v1'

dotenv.config();
const app = express();
app.use(requestIdMiddleware);
app.use(express.json());
app.use(loggingMiddleware);
// app.use((req, res, next) => {
//     const start = Date.now();

//     // When response is finished, log status & info
//     res.on('finish', () => {
//         const duration = Date.now() - start;

//         logger.info({
//             method: req.method,
//             url: req.originalUrl,
//             status: res.statusCode,
//             duration: `${duration}ms`,
//         }, 'request_completed');
//     });

//     next();
// });


// Routes
app.use(`/api/${version}/auth`, authRoutes);
// app.use('/api/feed', feedRoutes);

// error handler (last)
app.use(errorHandler);

// Start server
const PORT = config.port;;

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const startServer = async () => {
    try {
        // Retry loop for Postgres
        let attempts = 0;
        while (attempts < 10) {
            try {
                await testPostgres();
                await sequelize.sync({ alter: true });
                break;
            } catch (err) {
                attempts++;
                console.log(`Postgres not ready, attempt ${attempts}/10. Retrying in 3s...`);
                await wait(3000);
            }
        }

        // Connect Mongo with retry
        attempts = 0;
        while (attempts < 10) {
            try {
                await connectMongo();
                break;
            } catch (err) {
                attempts++;
                console.log(`Mongo not ready, attempt ${attempts}/10. Retrying in 3s...`);
                await wait(3000);
            }
        }

        // Redis test (simple)
        attempts = 0;
        while (attempts < 10) {
            try {
                await testRedis();
                break;
            } catch (err) {
                attempts++;
                console.log(`Redis not ready, attempt ${attempts}/10. Retrying in 3s...`);
                await wait(3000);
            }
        }

        app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error('Startup error:', err);
        process.exit(1);
    }
};

startServer();
