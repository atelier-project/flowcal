import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, ApiError } from '../middleware/errors.js';
import { requireAuth, optionalAuth, isAdmin, uuidParamGuard } from '../middleware/auth.js';
import { CAN_VIEW, CAN_LIST, CAN_UPDATE, CAN_DELETE } from './flowAccess.js';

export const flowsRouter = Router();

// Reject a non-UUID :id / :versionId with a clean 404 before it reaches Postgres.
flowsRouter.param('id', uuidParamGuard);
flowsRouter.param('versionId', uuidParamGuard);

// Keep only the newest N versions per flow.
const VERSION_RETENTION = 50;
const pruneVersions = (flowId) =>
    query(
        `delete from flow_versions
         where flow_id = $1
           and id not in (
             select id from flow_versions where flow_id = $1
             order by created_at desc limit ${VERSION_RETENTION}
           )`,
        [flowId]
    );

// Columns a client is allowed to set on a flow. Anything else is ignored.
const UPDATABLE = new Set(['name', 'data', 'is_public', 'is_template', 'team_id']);

// GET /api/flows — flows the user owns or is a team member of (NOT arbitrary
// public flows; those are reachable by their /guest/:id link only).
flowsRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await query(
        `select f.id, f.name, f.updated_at, f.is_public, f.is_template, f.owner_id,
                json_build_object('full_name', p.full_name, 'email', p.email) as profiles
         from flows f
         join profiles p on p.id = f.owner_id
         where ${CAN_LIST}
         order by f.updated_at desc`,
        [req.user.id, isAdmin(req.user)]
    );
    res.json(rows);
}));

// POST /api/flows — create an empty flow owned by the current user.
flowsRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
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

// GET /api/flows/templates — flows an admin has published as templates. They're
// public by construction, so any authenticated user can browse and duplicate
// them. Declared before `/:id` so "templates" isn't parsed as an id.
flowsRouter.get('/templates', requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await query(
        `select f.id, f.name, f.updated_at, f.owner_id,
                json_build_object('full_name', p.full_name, 'email', p.email) as profiles
         from flows f
         join profiles p on p.id = f.owner_id
         where f.is_template = true
         order by f.updated_at desc`
    );
    res.json(rows);
}));

// GET /api/flows/:id — viewable by the owner, team members, admins, OR anyone
// (including anonymous callers) when the flow is public. optionalAuth resolves
// the session if present but doesn't require it, so a null user only matches
// the is_public branch of CAN_VIEW. Mirrors the RLS "Flows: View" anon grant.
flowsRouter.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
    const { rows } = await query(
        `select f.* from flows f
         join profiles p on p.id = f.owner_id
         where f.id = $3 and ${CAN_VIEW}`,
        [req.user?.id ?? null, isAdmin(req.user), req.params.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Flow not found');
    res.json(rows[0]);
}));

// PATCH /api/flows/:id — owner or team owner/admin.
flowsRouter.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
    const updates = req.body || {};
    // Optional optimistic-concurrency guard: the client sends the updated_at it
    // last loaded. If another tab/device has saved since, the row's updated_at
    // has moved on and we refuse the write (409) instead of clobbering it.
    const baseUpdatedAt = updates.baseUpdatedAt ?? null;
    const cols = Object.keys(updates).filter((k) => UPDATABLE.has(k));
    if (cols.length === 0) throw new ApiError(400, 'No updatable fields provided');

    // $1 user (used by CAN_UPDATE), $2 id, then update values from $3.
    // jsonb columns need an explicit cast from the text-typed bind param.
    const setClause = cols
        .map((col, i) => `${col} = $${i + 3}${col === 'data' ? '::jsonb' : ''}`)
        .join(', ');
    const values = cols.map((c) => (c === 'data' ? JSON.stringify(updates[c]) : updates[c]));

    // Compare at millisecond precision: node-postgres reads timestamptz as a JS
    // Date (ms), so the value the client echoes back is already ms-truncated.
    const guard = baseUpdatedAt
        ? ` and date_trunc('milliseconds', f.updated_at) = $${values.length + 3}::timestamptz`
        : '';
    const guardValues = baseUpdatedAt ? [baseUpdatedAt] : [];

    const { rows } = await query(
        `update flows f set ${setClause}
         where f.id = $2 and ${CAN_UPDATE}${guard}
         returning f.*`,
        [req.user.id, req.params.id, ...values, ...guardValues]
    );

    if (!rows[0]) {
        // Distinguish a stale-write conflict from a genuine 404/permission miss:
        // if the guard was set and the flow is still visible+updatable to us,
        // the mismatch was the version guard.
        if (baseUpdatedAt) {
            const { rows: current } = await query(
                `select f.updated_at from flows f where f.id = $2 and ${CAN_UPDATE}`,
                [req.user.id, req.params.id]
            );
            if (current[0]) {
                throw new ApiError(409, 'This flow was changed somewhere else since you opened it.');
            }
        }
        throw new ApiError(404, 'Flow not found or not permitted');
    }
    res.json(rows[0]);
}));

// DELETE /api/flows/:id — owner or team owner.
flowsRouter.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
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
flowsRouter.post('/:id/duplicate', requireAuth, asyncHandler(async (req, res) => {
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

// ── Flow versions ────────────────────────────────────────────────────────────
// All version operations require edit access to the parent flow (CAN_UPDATE:
// owner or team owner/admin). This deliberately excludes public/anon/shared
// viewers — they see only the current flow, never its history.

// GET /api/flows/:id/versions — history metadata (no data payload), newest first.
flowsRouter.get('/:id/versions', requireAuth, asyncHandler(async (req, res) => {
    const access = await query(
        `select 1 from flows f where f.id = $2 and ${CAN_UPDATE}`,
        [req.user.id, req.params.id]
    );
    if (!access.rows[0]) throw new ApiError(404, 'Flow not found or not permitted');

    const { rows } = await query(
        `select v.id, v.label, v.origin, v.created_at,
                json_build_object('full_name', p.full_name, 'email', p.email) as author
         from flow_versions v
         left join profiles p on p.id = v.author_id
         where v.flow_id = $1
         order by v.created_at desc`,
        [req.params.id]
    );
    res.json(rows);
}));

// GET /api/flows/:id/versions/:versionId — one version *including* its data
// payload, for read-only preview and diffing (#39). Same CAN_UPDATE gate as the
// rest of the history: viewers never see a flow's past.
flowsRouter.get('/:id/versions/:versionId', requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await query(
        `select v.id, v.label, v.origin, v.created_at, v.data
         from flow_versions v
         join flows f on f.id = v.flow_id
         where v.id = $2 and v.flow_id = $3 and ${CAN_UPDATE}`,
        [req.user.id, req.params.versionId, req.params.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Version not found or not permitted');
    res.json(rows[0]);
}));

// POST /api/flows/:id/versions — snapshot the flow's current data (label optional).
flowsRouter.post('/:id/versions', requireAuth, asyncHandler(async (req, res) => {
    const label = (req.body?.label ?? '').toString().trim().slice(0, 200) || null;
    const flow = await query(
        `select f.data from flows f where f.id = $2 and ${CAN_UPDATE}`,
        [req.user.id, req.params.id]
    );
    if (!flow.rows[0]) throw new ApiError(404, 'Flow not found or not permitted');

    const inserted = await query(
        `insert into flow_versions (flow_id, author_id, data, label, origin)
         values ($1, $2, $3::jsonb, $4, 'manual')
         returning id, label, origin, created_at`,
        [req.params.id, req.user.id, JSON.stringify(flow.rows[0].data), label]
    );
    await pruneVersions(req.params.id);
    res.status(201).json(inserted.rows[0]);
}));

// POST /api/flows/:id/versions/:versionId/restore — set the flow's data to the
// snapshot, after saving the current state as a "Before restore" version so the
// restore is non-destructive.
flowsRouter.post('/:id/versions/:versionId/restore', requireAuth, asyncHandler(async (req, res) => {
    const target = await query(
        `select v.data as version_data, f.data as current_data
         from flow_versions v
         join flows f on f.id = v.flow_id
         where v.id = $2 and v.flow_id = $3 and ${CAN_UPDATE}`,
        [req.user.id, req.params.versionId, req.params.id]
    );
    if (!target.rows[0]) throw new ApiError(404, 'Version not found or not permitted');

    await query(
        `insert into flow_versions (flow_id, author_id, data, label, origin)
         values ($1, $2, $3::jsonb, $4, 'auto')`,
        [req.params.id, req.user.id, JSON.stringify(target.rows[0].current_data), 'Before restore']
    );
    const updated = await query(
        `update flows set data = $1::jsonb where id = $2 returning *`,
        [JSON.stringify(target.rows[0].version_data), req.params.id]
    );
    await pruneVersions(req.params.id);
    res.json(updated.rows[0]);
}));

// DELETE /api/flows/:id/versions/:versionId — remove a single version.
flowsRouter.delete('/:id/versions/:versionId', requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await query(
        `delete from flow_versions v
         using flows f
         where v.id = $2 and v.flow_id = $3 and f.id = v.flow_id and ${CAN_UPDATE}
         returning v.id`,
        [req.user.id, req.params.versionId, req.params.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Version not found or not permitted');
    res.json({ success: true });
}));
