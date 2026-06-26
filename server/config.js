import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_JWT_SECRET = 'dev-insecure-secret-change-me';

export const config = {
    databaseUrl: process.env.DATABASE_URL || 'postgres://flowcal:flowcal@localhost:5432/flowcal',
    jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    // In dev the Vite SPA runs on a different origin and needs credentialed CORS.
    // In the single-container prod build the API serves the SPA from the same origin.
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    // Whether the session cookie requires HTTPS (set true behind TLS in prod).
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    // Path to the built SPA to serve statically (Phase 4 / prod). Empty = API only.
    staticDir: process.env.STATIC_DIR || '',
    cookieName: 'fc_session',
};

export const isProd = config.nodeEnv === 'production';

// Fail fast on an insecure secret in production rather than silently shipping it.
if (isProd && config.jwtSecret === DEFAULT_JWT_SECRET) {
    throw new Error('JWT_SECRET must be set to a strong value in production.');
}
