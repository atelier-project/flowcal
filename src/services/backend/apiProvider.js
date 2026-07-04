/**
 * Self-hosted backend implementation of the BackendProvider interface.
 *
 * Talks to the Express + Postgres API in /server over fetch. The session lives
 * in an httpOnly cookie, so every request sends `credentials: 'include'` and
 * there is no token to manage client-side.
 *
 * Selected when VITE_BACKEND=api. See ./provider.types.js for the contract.
 *
 * @type {import('./provider.types').BackendProvider}
 */

// In dev the API runs on its own origin (set VITE_API_URL, e.g. http://localhost:3001).
// In the single-container prod build the API serves the SPA, so same-origin '' works.
const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API_BASE}/api${path}`, {
        method,
        credentials: 'include',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
            const data = await res.json();
            if (data?.error) message = data.error;
        } catch {
            /* non-JSON error body */
        }
        throw new ApiError(message, res.status);
    }

    if (res.status === 204) return null;
    return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────
// There is no realtime session feed (unlike Supabase), so we keep a local set of
// listeners and notify them whenever auth state changes (sign in/up/out).

const listeners = new Set();

function notify(session) {
    listeners.forEach((cb) => cb(session));
}

async function getSession() {
    try {
        const { session } = await api('/auth/session');
        return session ?? null;
    } catch {
        return null;
    }
}

function onAuthStateChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

// signUp/signIn return Supabase's { data, error } shape so callers (Login) can
// destructure `error` unchanged. The server sets the session cookie on success.
async function signUp(credentials) {
    try {
        const data = await api('/auth/signup', { method: 'POST', body: credentials });
        notify({ user: data.user });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

async function signIn(credentials) {
    try {
        const data = await api('/auth/signin', { method: 'POST', body: credentials });
        notify({ user: data.user });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

async function signOut() {
    // Clear local auth state even if the network call fails, so a blip can't
    // strand the UI in a signed-in state.
    try {
        await api('/auth/signout', { method: 'POST' });
    } finally {
        notify(null);
    }
}

async function getProfile(userId) {
    try {
        return await api(`/profiles/${userId}`);
    } catch {
        return null;
    }
}

// Public auth config (e.g. whether new registrations are open). Falls back to
// "enabled" if the endpoint is unreachable, so the UI never wrongly hides signup.
async function getAuthConfig() {
    try {
        return await api('/auth/config');
    } catch {
        return { signupsEnabled: true };
    }
}

// ── Flows ────────────────────────────────────────────────────────────────────

const listFlows = () => api('/flows');

const createFlow = (name = 'Untitled Flow', teamId = null) =>
    api('/flows', { method: 'POST', body: { name, teamId } });

const getFlow = (id) => api(`/flows/${id}`);

const updateFlow = (id, updates) =>
    api(`/flows/${id}`, { method: 'PATCH', body: updates });

async function deleteFlow(id) {
    await api(`/flows/${id}`, { method: 'DELETE' });
    return true;
}

const duplicateFlow = (id) => api(`/flows/${id}/duplicate`, { method: 'POST' });

// Template flows (published by an admin) that any user can browse + duplicate.
const listTemplates = () => api('/flows/templates');

// Admin-only: publish/unpublish a flow as a shared template.
const setFlowTemplate = (id, isTemplate) =>
    api(`/admin/flows/${id}/template`, { method: 'PATCH', body: { isTemplate } });

// ── Flow versions ──────────────────────────────────────────────────────────

const listVersions = (flowId) => api(`/flows/${flowId}/versions`);

const createVersion = (flowId, label = null) =>
    api(`/flows/${flowId}/versions`, { method: 'POST', body: { label } });

const restoreVersion = (flowId, versionId) =>
    api(`/flows/${flowId}/versions/${versionId}/restore`, { method: 'POST' });

async function deleteVersion(flowId, versionId) {
    await api(`/flows/${flowId}/versions/${versionId}`, { method: 'DELETE' });
    return true;
}

// ── Profile settings (current user) ──────────────────────────────────────────

async function getProfileSettings(userId) {
    try {
        const p = await api(`/profiles/${userId}`);
        if (!p) return null;
        return {
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            support_access_granted: p.support_access_granted,
        };
    } catch {
        return null;
    }
}

const updateProfile = (userId, updates) =>
    api('/profiles/me', { method: 'PATCH', body: updates });

const setSupportAccess = (userId, granted) =>
    api('/profiles/me', { method: 'PATCH', body: { support_access_granted: granted } });

const scheduleAccountDeletion = () =>
    api('/profiles/me/deletion', { method: 'POST' });

// ── Admin ────────────────────────────────────────────────────────────────────

const listAllUsers = () => api('/admin/users');

const listAllFlows = () => api('/admin/flows');

const setUserBanned = (userId, banned) =>
    api(`/admin/users/${userId}/ban`, { method: 'PATCH', body: { banned } });

export const apiProvider = {
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
