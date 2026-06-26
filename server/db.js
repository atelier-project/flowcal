import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

/**
 * Run a parameterized query. Always pass user input via `params` — never
 * interpolate into `text` — so queries are injection-safe.
 */
export const query = (text, params) => pool.query(text, params);

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
