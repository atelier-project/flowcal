import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { issueToken, sessionCookieOptions } from '../auth/jwt.js';
import { config } from '../config.js';
import { asyncHandler, ApiError } from '../middleware/errors.js';
import { resolveUser } from '../middleware/auth.js';

export const authRouter = Router();

function setSession(res, user) {
    const token = issueToken(user);
    res.cookie(config.cookieName, token, sessionCookieOptions());
    return token;
}

// POST /api/auth/signup — create a user + profile, then sign in.
authRouter.post('/signup', asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ApiError(400, 'Email and password are required');
    if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

    const existing = await query('select 1 from users where email = $1', [email]);
    if (existing.rowCount > 0) throw new ApiError(409, 'An account with that email already exists');

    const passwordHash = await hashPassword(password);

    // Create the auth user and its profile atomically (replaces the Supabase
    // handle_new_user trigger).
    const user = await withTransaction(async (client) => {
        const { rows } = await client.query(
            'insert into users (email, password_hash) values ($1, $2) returning id, email',
            [email, passwordHash]
        );
        const created = rows[0];
        await client.query(
            "insert into profiles (id, email, role) values ($1, $2, 'user')",
            [created.id, created.email]
        );
        return created;
    });

    setSession(res, user);
    res.status(201).json({ user: { id: user.id, email: user.email } });
}));

// POST /api/auth/signin
authRouter.post('/signin', asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ApiError(400, 'Email and password are required');

    const { rows } = await query(
        `select u.id, u.email, u.password_hash, p.is_banned, p.deleted_at
         from users u join profiles p on p.id = u.id
         where u.email = $1`,
        [email]
    );
    const row = rows[0];

    // Same generic message whether the email is unknown or the password is wrong.
    if (!row || !(await verifyPassword(password, row.password_hash))) {
        throw new ApiError(401, 'Invalid email or password');
    }
    if (row.is_banned) throw new ApiError(403, 'This account has been suspended');
    if (row.deleted_at) throw new ApiError(403, 'This account has been deleted');

    setSession(res, row);
    res.json({ user: { id: row.id, email: row.email } });
}));

// POST /api/auth/signout
authRouter.post('/signout', (req, res) => {
    res.clearCookie(config.cookieName, { path: '/' });
    res.json({});
});

// GET /api/auth/session — current session, or null.
authRouter.get('/session', asyncHandler(async (req, res) => {
    const user = await resolveUser(req);
    res.json({ session: user ? { user } : null });
}));
