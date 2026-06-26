import { config } from '../config.js';
import { verifyToken } from '../auth/jwt.js';
import { query } from '../db.js';
import { ApiError } from './errors.js';

/**
 * Extract the session token from the httpOnly cookie or a Bearer header.
 */
function readToken(req) {
    if (req.cookies?.[config.cookieName]) return req.cookies[config.cookieName];
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
}

/**
 * Resolve the current user from the request, or null if not authenticated.
 * Re-reads the profile so role/ban/deletion changes apply immediately
 * (mirrors the Supabase is_active_user() check).
 */
export async function resolveUser(req) {
    const token = readToken(req);
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.sub) return null;

    const { rows } = await query(
        `select id, email, role, is_banned, deleted_at
         from profiles where id = $1`,
        [payload.sub]
    );
    const profile = rows[0];
    if (!profile || profile.is_banned || profile.deleted_at) return null;

    return { id: profile.id, email: profile.email, role: profile.role };
}

/** Require a valid, active session. Attaches req.user. */
export function requireAuth(req, _res, next) {
    resolveUser(req)
        .then((user) => {
            if (!user) throw new ApiError(401, 'Not authenticated');
            req.user = user;
            next();
        })
        .catch(next);
}

/** Require an admin/superuser session. Mirrors is_app_admin(). */
export function requireAdmin(req, _res, next) {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));
    if (!['admin', 'superuser'].includes(req.user.role)) {
        return next(new ApiError(403, 'Admin access required'));
    }
    next();
}

export const isAdmin = (user) => ['admin', 'superuser'].includes(user?.role);
