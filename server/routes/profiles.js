import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, ApiError } from '../middleware/errors.js';
import { requireAuth, isAdmin, uuidParamGuard } from '../middleware/auth.js';

export const profilesRouter = Router();
profilesRouter.param('id', uuidParamGuard);
profilesRouter.use(requireAuth);

// Self-updatable profile fields. Privileged columns (role, tier, is_banned)
// are intentionally excluded — this reproduces the "Restricted Self Update" RLS.
const SELF_UPDATABLE = new Set(['full_name', 'avatar_url', 'support_access_granted']);

// PATCH /api/profiles/me — update the current user's own profile.
profilesRouter.patch('/me', asyncHandler(async (req, res) => {
    const updates = req.body || {};
    const cols = Object.keys(updates).filter((k) => SELF_UPDATABLE.has(k));
    if (cols.length === 0) throw new ApiError(400, 'No updatable fields provided');

    const setClause = cols.map((col, i) => `${col} = $${i + 2}`).join(', ');
    const values = cols.map((c) => updates[c]);

    const { rows } = await query(
        `update profiles set ${setClause}
         where id = $1 and deleted_at is null
         returning id, email, full_name, avatar_url, role, tier, support_access_granted`,
        [req.user.id, ...values]
    );
    if (!rows[0]) throw new ApiError(404, 'Profile not found');
    res.json(rows[0]);
}));

// POST /api/profiles/me/deletion — schedule the current account for deletion.
// Mirrors the schedule_account_deletion() RPC: sets deleted_at = now().
profilesRouter.post('/me/deletion', asyncHandler(async (req, res) => {
    await query('update profiles set deleted_at = now() where id = $1', [req.user.id]);
    res.json({ success: true });
}));

// GET /api/profiles/:id — own profile, or any profile for admins.
// Reproduces the "Profiles: View" RLS (self or app admin).
profilesRouter.get('/:id', asyncHandler(async (req, res) => {
    if (req.params.id !== req.user.id && !isAdmin(req.user)) {
        throw new ApiError(403, 'Not permitted');
    }
    const { rows } = await query('select * from profiles where id = $1', [req.params.id]);
    if (!rows[0]) throw new ApiError(404, 'Profile not found');
    res.json(rows[0]);
}));
