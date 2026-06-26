import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction, waitForDb } from './db.js';

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
    await waitForDb();
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

    await bootstrapAdmin();
}

/**
 * Promote the account named by ADMIN_EMAIL (if set) to admin on every boot.
 * Idempotent, and a no-op if the var is unset or the account hasn't signed up
 * yet. Lets a self-host/Atelier deploy designate an admin without container
 * exec — set the ADMIN_EMAIL env/secret and restart.
 */
async function bootstrapAdmin() {
    const email = process.env.ADMIN_EMAIL;
    if (!email) return;

    const normalized = email.trim().toLowerCase();
    const { rowCount } = await pool.query(
        "update profiles set role = 'admin' where lower(email) = $1 and role <> 'admin'",
        [normalized]
    );
    const { rows } = await pool.query('select role from profiles where lower(email) = $1', [normalized]);
    if (rows[0]) {
        console.log(`Admin bootstrap: ${email} is role=${rows[0].role}${rowCount ? ' (promoted)' : ''}.`);
    } else {
        console.log(`Admin bootstrap: no account for ${email} yet — sign up, then restart/redeploy to promote.`);
    }
}

run()
    .then(() => pool.end())
    .catch(async (err) => {
        console.error('Migration failed:', err.message);
        await pool.end();
        process.exit(1);
    });
