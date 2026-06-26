import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

/**
 * Run a parameterized query. Always pass user input via `params` — never
 * interpolate into `text` — so queries are injection-safe.
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Wait for the database to accept connections, retrying with a fixed delay.
 * Used at startup so a fresh deploy (where Postgres may still be initializing)
 * doesn't crash-loop before the DB is ready.
 */
export async function waitForDb({ retries = 30, delayMs = 2000 } = {}) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await pool.query('select 1');
            return;
        } catch (err) {
            if (attempt === retries) throw err;
            console.log(`Waiting for database (${attempt}/${retries}): ${err.code || err.message}`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}

/**
 * Run `fn` inside a transaction, passing it a dedicated client. Commits on
 * success, rolls back on any thrown error.
 */
export async function withTransaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
