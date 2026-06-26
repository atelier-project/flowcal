import { pool, withTransaction, query } from '../db.js';
import { hashPassword } from '../auth/password.js';

/**
 * Bootstrap or promote an admin account.
 *
 *   npm run create-admin -- <email> <password>
 *
 * If the email already exists, it is promoted to role=admin (password ignored).
 * Otherwise a new user + admin profile is created. Self-hosters use this once
 * to get their first admin, since there is no Supabase dashboard.
 */
async function main() {
    const [email, password] = process.argv.slice(2);
    if (!email) {
        console.error('Usage: npm run create-admin -- <email> <password>');
        process.exit(1);
    }

    const existing = await query('select id from users where email = $1', [email]);
    if (existing.rows[0]) {
        await query("update profiles set role = 'admin' where id = $1", [existing.rows[0].id]);
        console.log(`✓ Promoted existing user ${email} to admin.`);
        return;
    }

    if (!password) {
        console.error('A password is required when creating a new admin.');
        process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    await withTransaction(async (client) => {
        const { rows } = await client.query(
            'insert into users (email, password_hash) values ($1, $2) returning id',
            [email, passwordHash]
        );
        await client.query(
            "insert into profiles (id, email, role) values ($1, $2, 'admin')",
            [rows[0].id, email]
        );
    });
    console.log(`✓ Created admin ${email}.`);
}

main()
    .then(() => pool.end())
    .catch(async (err) => {
        console.error('Failed:', err.message);
        await pool.end();
        process.exit(1);
    });
