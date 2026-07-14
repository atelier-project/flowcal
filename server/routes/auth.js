import { Router } from 'express';
import { query } from '../db.js';
import { verifyPassword, DUMMY_HASH } from '../auth/password.js';
import { issueToken, sessionCookieOptions } from '../auth/jwt.js';
import { config } from '../config.js';
import { asyncHandler, ApiError } from '../middleware/errors.js';
import { resolveUser } from '../middleware/auth.js';
import { getSignupsEnabled } from '../settings.js';
import { createUser, normalizeEmail } from '../auth/users.js';

export const authRouter = Router();

function setSession(res, user) {
    const token = issueToken(user);
    res.cookie(config.cookieName, token, sessionCookieOptions());
    return token;
}

// GET /api/auth/config — public auth config so the login page can adapt
// (e.g. hide the sign-up form when registration is closed).
authRouter.get('/config', asyncHandler(async (_req, res) => {
    res.json({ signupsEnabled: await getSignupsEnabled() });
}));

// POST /api/auth/signup — create a user + profile, then sign in.
authRouter.post('/signup', asyncHandler(async (req, res) => {
    if (!(await getSignupsEnabled())) throw new ApiError(403, 'New registrations are disabled');

    // Shared with the admin "add user" route, so the two can't drift apart on
    // validation, hashing, or the user+profile invariant.
    const user = await createUser({ email: req.body?.email, password: req.body?.password });

    setSession(res, user);
    res.status(201).json({ user: { id: user.id, email: user.email } });
}));

// POST /api/auth/signin
authRouter.post('/signin', asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};
    if (!email || !password) throw new ApiError(400, 'Email and password are required');

    const { rows } = await query(
        `select u.id, u.email, u.password_hash, p.is_banned, p.deleted_at
         from users u join profiles p on p.id = u.id
         where u.email = $1`,
        [email]
    );
    const row = rows[0];

    // Always run a bcrypt compare (against a dummy hash when the email is
    // unknown) so timing doesn't reveal whether the account exists. Same
    // generic message whether the email is unknown or the password is wrong.
    const passwordOk = await verifyPassword(password, row?.password_hash || DUMMY_HASH);
    if (!row || !passwordOk) {
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
