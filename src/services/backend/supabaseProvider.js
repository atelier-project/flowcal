import { supabase } from '../../lib/supabase';

/**
 * Supabase implementation of the BackendProvider interface.
 *
 * This is the single place in the app that knows about Supabase table names,
 * RPCs, and auth specifics. It preserves the exact behavior the app had when
 * these calls lived inline in flowService / AuthContext / ProfileSettings /
 * AdminDashboard.
 */

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session ?? null;
}

function onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => callback(session ?? null)
    );
    return () => subscription.unsubscribe();
}

function signUp(credentials) {
    return supabase.auth.signUp(credentials);
}

function signIn(credentials) {
    return supabase.auth.signInWithPassword(credentials);
}

function signOut() {
    return supabase.auth.signOut();
}

async function getProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) return null;
    return data;
}

// Supabase enforces new-user signups at the project level (Auth settings). This
// only controls the UI; set VITE_SIGNUPS_ENABLED=false to also hide the form.
async function getAuthConfig() {
    return { signupsEnabled: import.meta.env.VITE_SIGNUPS_ENABLED !== 'false' };
}

// ── Flows ────────────────────────────────────────────────────────────────────

async function listFlows() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // "Shared with Me" should be owned + team flows only — not every public flow
    // (those stay reachable by their /guest/:id link). RLS still allows viewing
    // public flows for a direct fetch; here we additionally scope the LISTING to
    // ours + our teams' (see #43).
    const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);
    const teamIds = (memberships || []).map((m) => m.team_id);

    const orFilters = [`owner_id.eq.${user.id}`];
    if (teamIds.length) orFilters.push(`team_id.in.(${teamIds.join(',')})`);

    const { data, error } = await supabase
        .from('flows')
        .select('id, name, updated_at, is_public, is_template, owner_id, profiles:owner_id(full_name, email)')
        .or(orFilters.join(','))
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
}

async function createFlow(name = 'Untitled Flow', teamId = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('flows')
        .insert({
            name,
            owner_id: user.id,
            team_id: teamId,
            data: { nodes: [], edges: [] } // Initial empty state
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function getFlow(id) {
    const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

async function updateFlow(id, updates) {
    // Optional optimistic-concurrency guard (see #38): baseUpdatedAt is the
    // updated_at the client last loaded; if it no longer matches, another writer
    // has saved since and we refuse rather than clobber. It's not a column.
    const { baseUpdatedAt, ...fields } = updates;

    let q = supabase
        .from('flows')
        .update({
            ...fields,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);
    if (baseUpdatedAt) q = q.eq('updated_at', baseUpdatedAt);

    const { data, error } = await q.select();
    if (error) throw error;

    if (!data || data.length === 0) {
        // No row updated. If the flow is still there for us, the version guard
        // was what failed — surface a 409 so the editor can prompt to resolve.
        if (baseUpdatedAt) {
            let stillExists = false;
            try { stillExists = !!(await getFlow(id)); } catch { stillExists = false; }
            if (stillExists) {
                const err = /** @type {Error & { status?: number }} */ (
                    new Error('This flow was changed somewhere else since you opened it.')
                );
                err.status = 409;
                throw err;
            }
        }
        const err = /** @type {Error & { status?: number }} */ (new Error('Flow not found or not permitted'));
        err.status = 404;
        throw err;
    }
    return data[0];
}

async function deleteFlow(id) {
    const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

async function duplicateFlow(id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Get original flow data
    const original = await getFlow(id);
    if (!original) throw new Error('Flow not found');

    // 2. Create new flow with copy suffix
    const { data, error } = await supabase
        .from('flows')
        .insert({
            name: `${original.name} (Copy)`,
            owner_id: user.id, // Current user becomes owner of copy
            data: original.data, // Copy nodes/edges
            is_public: false // Default to private
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ── Flow versions ─────────────────────────────────────────────────────────────
// RLS ("Flow Versions: *") restricts every operation below to editors of the
// parent flow (owner or team owner/admin).

const VERSION_RETENTION = 50;

// Keep only the newest N versions for a flow.
async function pruneVersions(flowId) {
    const { data } = await supabase
        .from('flow_versions')
        .select('id')
        .eq('flow_id', flowId)
        .order('created_at', { ascending: false });
    const excess = (data || []).slice(VERSION_RETENTION).map((r) => r.id);
    if (excess.length) {
        await supabase.from('flow_versions').delete().in('id', excess);
    }
}

async function listVersions(flowId) {
    const { data, error } = await supabase
        .from('flow_versions')
        .select('id, label, origin, created_at, author:author_id(full_name, email)')
        .eq('flow_id', flowId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// One version *with* its data payload — for read-only preview and diff (#39).
async function getVersion(flowId, versionId) {
    const { data, error } = await supabase
        .from('flow_versions')
        .select('id, label, origin, created_at, data')
        .eq('flow_id', flowId)
        .eq('id', versionId)
        .single();
    if (error) throw error;
    return data;
}

async function createVersion(flowId, label = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const flow = await getFlow(flowId);
    if (!flow) throw new Error('Flow not found');

    const { data, error } = await supabase
        .from('flow_versions')
        .insert({ flow_id: flowId, author_id: user.id, data: flow.data, label: label || null, origin: 'manual' })
        .select('id, label, origin, created_at')
        .single();
    if (error) throw error;
    await pruneVersions(flowId);
    return data;
}

async function restoreVersion(flowId, versionId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error: vErr } = await supabase
        .from('flow_versions')
        .select('data')
        .eq('id', versionId)
        .eq('flow_id', flowId)
        .single();
    if (vErr) throw vErr;

    const current = await getFlow(flowId);
    // Snapshot the pre-restore state so nothing is lost.
    await supabase
        .from('flow_versions')
        .insert({ flow_id: flowId, author_id: user.id, data: current.data, label: 'Before restore', origin: 'auto' });

    const updated = await updateFlow(flowId, { data: version.data });
    await pruneVersions(flowId);
    return updated;
}

async function deleteVersion(flowId, versionId) {
    const { error } = await supabase
        .from('flow_versions')
        .delete()
        .eq('id', versionId)
        .eq('flow_id', flowId);
    if (error) throw error;
    return true;
}

// ── Profile settings (current user) ──────────────────────────────────────────

async function getProfileSettings(userId) {
    const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, support_access_granted')
        .eq('id', userId)
        .single();
    return data ?? null;
}

async function updateProfile(userId, updates) {
    const { error } = await supabase
        .from('profiles')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    if (error) throw error;
}

async function setSupportAccess(userId, granted) {
    const { error } = await supabase
        .from('profiles')
        .update({ support_access_granted: granted })
        .eq('id', userId);
    if (error) throw error;
}

async function scheduleAccountDeletion() {
    const { error } = await supabase.rpc('schedule_account_deletion');
    if (error) throw error;
}

// ── Admin ────────────────────────────────────────────────────────────────────

async function listAllUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function listAllFlows() {
    const { data, error } = await supabase
        .from('flows')
        .select('*, profiles(email)')
        .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function setUserBanned(userId, banned) {
    const { error } = await supabase
        .from('profiles')
        .update({ is_banned: banned })
        .eq('id', userId);
    if (error) throw error;
}

// Template flows an admin has published — public, so any user can browse them.
async function listTemplates() {
    const { data, error } = await supabase
        .from('flows')
        .select('id, name, updated_at, owner_id, profiles:owner_id(full_name, email)')
        .eq('is_template', true)
        .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
}

// Admin-only: publish/unpublish a flow as a shared template. Marking also makes
// it public so it's viewable + duplicatable by everyone. Requires the "Flows:
// Update" RLS policy to grant is_app_admin() (see supabase_schema.sql).
async function setFlowTemplate(id, isTemplate) {
    const updates = isTemplate ? { is_template: true, is_public: true } : { is_template: false };
    const { data, error } = await supabase
        .from('flows')
        .update(updates)
        .eq('id', id)
        .select('id, is_template, is_public')
        .single();
    if (error) throw error;
    return data;
}

/** @type {import('./provider.types').BackendProvider} */
export const supabaseProvider = {
    // Auth
    getSession,
    onAuthStateChange,
    signUp,
    signIn,
    signOut,
    getProfile,
    getAuthConfig,
    // Flows
    listFlows,
    createFlow,
    getFlow,
    updateFlow,
    deleteFlow,
    duplicateFlow,
    listTemplates,
    listVersions,
    getVersion,
    createVersion,
    restoreVersion,
    deleteVersion,
    // Profile settings
    getProfileSettings,
    updateProfile,
    setSupportAccess,
    scheduleAccountDeletion,
    // Admin
    listAllUsers,
    listAllFlows,
    setUserBanned,
    setFlowTemplate,
};
