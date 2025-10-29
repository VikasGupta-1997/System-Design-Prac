import dotenv from 'dotenv';
import path from 'path';


dotenv.config({ path: path.resolve(process.cwd(), '.env') });


export default {
    port: Number(process.env.PORT || 5000),
    jwtSecret: process.env.JWT_SECRET || 'change_me',
    postgres: {
        host: process.env.POSTGRES_HOST || '127.0.0.1',
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: process.env.POSTGRES_USER || 'devuser',
        password: process.env.POSTGRES_PASSWORD || 'devpass',
        db: process.env.POSTGRES_DB || 'instagram'
    },
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/instagram',
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379)
    }
};