import dotenv from 'dotenv';
import path from 'path';


dotenv.config({ path: path.resolve(process.cwd(), '.env') });


export default {
    port: Number(process.env.PORT || 5000),
    jwtSecret: process.env.JWT_SECRET || 'change_me',
    nodeEnv: process.env.NODE_ENV || 'development',
    isProd: (process.env.NODE_ENV || 'development') === 'production',
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
    },
    // OAuth
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    githubClientId: process.env.GITHUB_CLIENT_ID || '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',

    // Sessions & CSRF
    sessionCookieName: process.env.SESSION_COOKIE_NAME || 'sid',
    sessionTtlSec: Number(process.env.SESSION_TTL_SEC || 60 * 60 * 24 * 7), // 7d
    // sessionTtlSec: Number(process.env.SESSION_TTL_SEC || 120), // 7d
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    csrfCookieName: process.env.CSRF_COOKIE_NAME || 'csrf',
    clientBaseUrl: process.env.CLIENT_BASE_URL || ""

};