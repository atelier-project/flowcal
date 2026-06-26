import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, ApiError } from '../middleware/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// GET /api/admin/users — all profiles, newest first.
adminRouter.get('/users', asyncHandler(async (_req, res) => {
    const { rows } = await query('select * from profiles order by created_at desc');
    res.json(rows);
}));

// GET /api/admin/flows — every flow with its owner's email, newest first.
// Mirrors the admin `select *, profiles(email)` query.
adminRouter.get('/flows', asyncHandler(async (_req, res) => {
    const { rows } = await query(
        `select f.*, json_build_object('email', p.email) as profiles
         from flows f
         join profiles p on p.id = f.owner_id
         order by f.updated_at desc`
    );
    res.json(rows);
}));

// PATCH /api/admin/users/:id/ban — set a user's banned status.
adminRouter.patch('/users/:id/ban', asyncHandler(async (req, res) => {
    const { banned } = req.body || {};
    if (typeof banned !== 'boolean') throw new ApiError(400, '`banned` must be a boolean');
    const { rows } = await query(
        'update profiles set is_banned = $2 where id = $1 returning id, is_banned',
        [req.params.id, banned]
    );
    if (!rows[0]) throw new ApiError(404, 'User not found');
    res.json(rows[0]);
}));
