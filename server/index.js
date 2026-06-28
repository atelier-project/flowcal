import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config, isProd } from './config.js';
import { errorHandler } from './middleware/errors.js';
import { authRouter } from './routes/auth.js';
import { flowsRouter } from './routes/flows.js';
import { profilesRouter } from './routes/profiles.js';
import { adminRouter } from './routes/admin.js';

const app = express();

app.use(express.json({ limit: '5mb' })); // flows can hold large graphs
app.use(cookieParser());

// In dev the SPA is served by Vite on a different origin, so allow credentialed
// CORS from it. In the single-container prod build the API serves the SPA from
// the same origin and CORS is unnecessary.
if (!isProd) {
    app.use(cors({ origin: config.clientOrigin, credentials: true }));
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/admin', adminRouter);

// Optionally serve the built SPA (Phase 4: STATIC_DIR points at the Vite dist).
if (config.staticDir && existsSync(config.staticDir)) {
    app.use(express.static(config.staticDir));
    // SPA fallback: any non-API route returns index.html for client routing.
    app.get(/^(?!\/api\/).*/, (_req, res) => {
        res.sendFile(join(config.staticDir, 'index.html'));
    });
}

app.use(errorHandler);

app.listen(config.port, () => {
    console.log(`FlowCal API listening on :${config.port} (${config.nodeEnv})`);
});
