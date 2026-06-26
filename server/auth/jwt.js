import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Issue a signed session token for a user. The token carries identity only
 * (id + email); authority (role, ban status) is re-read from the DB on each
 * request so a role change or ban takes effect immediately.
 */
export function issueToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

/** Verify a token, returning its payload, or null if invalid/expired. */
export function verifyToken(token) {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch {
        return null;
    }
}

/** Cookie options for the session cookie. httpOnly so JS can't read the token. */
export function sessionCookieOptions() {
    return {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        path: '/',
    };
}
