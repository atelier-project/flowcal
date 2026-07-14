import { query, withTransaction } from '../db.js';
import { hashPassword, MAX_PASSWORD_BYTES } from './password.js';
import { ApiError } from '../middleware/errors.js';

/**
 * The one place a user account is created.
 *
 * Both self-service signup and admin "add user" go through here, so the two can
 * never drift apart on validation, hashing, or the user+profile invariant.
 */

/**
 * Normalize emails so case/whitespace variants map to one account (matches
 * Supabase; the users.email UNIQUE constraint is case-sensitive).
 * @param {unknown} email
 */
export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/** Roles an account can be created with. Superuser is never granted via the API. */
export const CREATABLE_ROLES = ['user', 'admin'];

/**
 * Validate credentials, then create the auth user and its profile atomically
 * (this replaces Supabase's handle_new_user trigger).
 *
 * Does NOT check whether signups are open — that is the caller's business:
 * self-service signup must respect it, an admin adding a user deliberately
 * bypasses it (being able to add someone *while registration is closed* is the
 * whole point).
 *
 * @param {{ email: unknown, password: unknown, role?: string }} input
 * @returns {Promise<{ id: string, email: string, role: string }>}
 */
export async function createUser({ email: rawEmail, password, role = 'user' }) {
    const email = normalizeEmail(rawEmail);
    if (!email || !password) throw new ApiError(400, 'Email and password are required');
    if (typeof password !== 'string' || password.length < 6) {
        throw new ApiError(400, 'Password must be at least 6 characters');
    }
    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
        throw new ApiError(400, `Password must be at most ${MAX_PASSWORD_BYTES} bytes`);
    }
    if (!CREATABLE_ROLES.includes(role)) {
        throw new ApiError(400, `Role must be one of: ${CREATABLE_ROLES.join(', ')}`);
    }

    const existing = await query('select 1 from users where email = $1', [email]);
    if (existing.rowCount > 0) throw new ApiError(409, 'An account with that email already exists');

    const passwordHash = await hashPassword(password);

    return withTransaction(async (client) => {
        const { rows } = await client.query(
            'insert into users (email, password_hash) values ($1, $2) returning id, email',
            [email, passwordHash]
        );
        const created = rows[0];
        await client.query(
            'insert into profiles (id, email, role) values ($1, $2, $3)',
            [created.id, created.email, role]
        );
        return { id: created.id, email: created.email, role };
    });
}
