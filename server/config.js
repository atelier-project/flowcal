import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_JWT_SECRET = 'dev-insecure-secret-change-me';

// Assemble a connection URL from discrete PG* parts.
//
// Orchestrators hand credentials over as separate environment variables rather
// than one pre-baked URL — the database's own container needs POSTGRES_USER /
// POSTGRES_PASSWORD / POSTGRES_DB anyway, and its hostname often isn't known
// until deploy time. That's exactly how atelier-spec.yaml wires this app up.
// DATABASE_URL, when set, still wins (docker-compose sets it), so nothing about
// the existing setup changes.
function databaseUrlFromParts() {
    const host = process.env.PGHOST;
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;
    const database = process.env.POSTGRES_DB;
    if (!host || !user || !password || !database) return null;

    const port = process.env.PGPORT || '5432';
    // A generated password can contain characters that are not URL-safe.
    return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export const config = {
    databaseUrl:
        process.env.DATABASE_URL ||
        databaseUrlFromParts() ||
        'postgres://flowcal:flowcal@localhost:5432/flowcal',
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
    // Allow new user registration. Set SIGNUPS_ENABLED=false to close signups —
    // the /signup route returns 403 and the login page hides the sign-up form.
    signupsEnabled: process.env.SIGNUPS_ENABLED !== 'false',
    cookieName: 'fc_session',
};

export const isProd = config.nodeEnv === 'production';

// Known weak/example secrets that must never sign real sessions. Checking a set
// (plus a length floor) rather than one literal means an example value copied
// from docker-compose.yml / .env.example can't slip through the prod guard.
const WEAK_JWT_SECRETS = new Set([
    DEFAULT_JWT_SECRET,
    'please-change-this-secret-in-production',
    'change-me-to-a-long-random-string',
]);

// Fail fast on a missing or weak secret in production rather than silently
// shipping one anyone could use to forge sessions.
if (isProd) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET must be set in production (e.g. openssl rand -hex 32).');
    }
    if (WEAK_JWT_SECRETS.has(config.jwtSecret) || config.jwtSecret.length < 16) {
        throw new Error('JWT_SECRET is too weak for production — use a long random value (e.g. openssl rand -hex 32).');
    }
}
