import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, ApiError } from '../middleware/errors.js';
import { requireAuth, requireAdmin, uuidParamGuard } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.param('id', uuidParamGuard);
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

// PATCH /api/admin/flows/:id/template — publish/unpublish a flow as a shared
// template. Marking also makes it public so any user can view and duplicate it.
adminRouter.patch('/flows/:id/template', asyncHandler(async (req, res) => {
    const { isTemplate } = req.body || {};
    if (typeof isTemplate !== 'boolean') throw new ApiError(400, '`isTemplate` must be a boolean');
    const { rows } = await query(
        `update flows
            set is_template = $2,
                is_public = case when $2 then true else is_public end
          where id = $1
          returning id, is_template, is_public`,
        [req.params.id, isTemplate]
    );
    if (!rows[0]) throw new ApiError(404, 'Flow not found');
    res.json(rows[0]);
}));

// PATCH /api/admin/users/:id/ban — set a user's banned status.
adminRouter.patch('/users/:id/ban', asyncHandler(async (req, res) => {
    const { banned } = req.body || {};
    if (typeof banned !== 'boolean') throw new ApiError(400, '`banned` must be a boolean');
    if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot change your own ban status');

    const target = await query('select role from profiles where id = $1', [req.params.id]);
    if (!target.rows[0]) throw new ApiError(404, 'User not found');
    if (target.rows[0].role === 'superuser') throw new ApiError(403, 'Superuser accounts cannot be banned');

    const { rows } = await query(
        'update profiles set is_banned = $2 where id = $1 returning id, is_banned',
        [req.params.id, banned]
    );
    res.json(rows[0]);
}));
