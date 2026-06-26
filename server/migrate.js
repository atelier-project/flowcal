import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from './db.js';

/**
 * Minimal forward-only migration runner. Applies every *.sql file in
 * ./migrations (sorted by name) that hasn't been applied yet, each inside a
 * transaction, and records it in the _migrations table.
 *
 * Run with `npm run migrate`. Safe to run repeatedly (idempotent).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

async function run() {
    await pool.query(`
        create table if not exists _migrations (
            name text primary key,
            applied_at timestamptz not null default now()
        )
    `);

    const { rows } = await pool.query('select name from _migrations');
    const applied = new Set(rows.map((r) => r.name));

    const files = (await readdir(migrationsDir))
        .filter((f) => f.endsWith('.sql'))
        .sort();

    let count = 0;
    for (const file of files) {
        if (applied.has(file)) continue;
        const sql = await readFile(join(migrationsDir, file), 'utf8');
        await withTransaction(async (client) => {
            await client.query(sql);
            await client.query('insert into _migrations (name) values ($1)', [file]);
        });
        console.log(`✓ applied ${file}`);
        count++;
    }

    console.log(count ? `Applied ${count} migration(s).` : 'No pending migrations.');
}

run()
    .then(() => pool.end())
    .catch(async (err) => {
        console.error('Migration failed:', err.message);
        await pool.end();
        process.exit(1);
    });
