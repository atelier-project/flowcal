import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, ApiError } from '../middleware/errors.js';
import { requireAuth, isAdmin } from '../middleware/auth.js';
import { CAN_VIEW, CAN_UPDATE, CAN_DELETE } from './flowAccess.js';

export const flowsRouter = Router();
flowsRouter.use(requireAuth);

// Columns a client is allowed to set on a flow. Anything else is ignored.
const UPDATABLE = new Set(['name', 'data', 'is_public', 'is_template', 'team_id']);

// GET /api/flows — every flow visible to the current user.
flowsRouter.get('/', asyncHandler(async (req, res) => {
    const { rows } = await query(
        `select f.id, f.name, f.updated_at, f.is_public, f.owner_id,
                json_build_object('full_name', p.full_name, 'email', p.email) as profiles
         from flows f
         join profiles p on p.id = f.owner_id
         where ${CAN_VIEW}
         order by f.updated_at desc`,
        [req.user.id, isAdmin(req.user)]
    );
    res.json(rows);
}));

// POST /api/flows — create an empty flow owned by the current user.
flowsRouter.post('/', asyncHandler(async (req, res) => {
    const name = req.body?.name ?? 'Untitled Flow';
    const teamId = req.body?.teamId ?? null;
    const { rows } = await query(
        `insert into flows (owner_id, team_id, name, data)
         values ($1, $2, $3, '{"nodes":[],"edges":[]}'::jsonb)
         returning *`,
        [req.user.id, teamId, name]
    );
    res.status(201).json(rows[0]);
}));

// GET /api/flows/:id
flowsRouter.get('/:id', asyncHandler(async (req, res) => {
    const { rows } = await query(
        `select f.* from flows f
         join profiles p on p.id = f.owner_id
         where f.id = $3 and ${CAN_VIEW}`,
        [req.user.id, isAdmin(req.user), req.params.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Flow not found');
    res.json(rows[0]);
}));

// PATCH /api/flows/:id — owner or team owner/admin.
flowsRouter.patch('/:id', asyncHandler(async (req, res) => {
    const updates = req.body || {};
    const cols = Object.keys(updates).filter((k) => UPDATABLE.has(k));
    if (cols.length === 0) throw new ApiError(400, 'No updatable fields provided');

    // $1 user (used by CAN_UPDATE), $2 id, then update values from $3.
    // jsonb columns need an explicit cast from the text-typed bind param.
    const setClause = cols
        .map((col, i) => `${col} = $${i + 3}${col === 'data' ? '::jsonb' : ''}`)
        .join(', ');
    const values = cols.map((c) => (c === 'data' ? JSON.stringify(updates[c]) : updates[c]));

    const { rows } = await query(
        `update flows f set ${setClause}
         where f.id = $2 and ${CAN_UPDATE}
         returning f.*`,
        [req.user.id, req.params.id, ...values]
    );
    if (!rows[0]) throw new ApiError(404, 'Flow not found or not permitted');
    res.json(rows[0]);
}));

// DELETE /api/flows/:id — owner or team owner.
flowsRouter.delete('/:id', asyncHandler(async (req, res) => {
    const { rows } = await query(
        `delete from flows f
         where f.id = $2 and ${CAN_DELETE}
         returning f.id`,
        [req.user.id, req.params.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Flow not found or not permitted');
    res.json({ success: true });
}));

// POST /api/flows/:id/duplicate — copy a viewable flow, owned by the copier.
flowsRouter.post('/:id/duplicate', asyncHandler(async (req, res) => {
    const original = await query(
        `select f.name, f.data from flows f
         join profiles p on p.id = f.owner_id
         where f.id = $3 and ${CAN_VIEW}`,
        [req.user.id, isAdmin(req.user), req.params.id]
    );
    if (!original.rows[0]) throw new ApiError(404, 'Flow not found');

    const { name, data } = original.rows[0];
    const { rows } = await query(
        `insert into flows (owner_id, name, data, is_public)
         values ($1, $2, $3, false)
         returning *`,
        [req.user.id, `${name} (Copy)`, data]
    );
    res.status(201).json(rows[0]);
}));
