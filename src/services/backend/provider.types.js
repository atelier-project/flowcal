/**
 * Backend provider interface.
 *
 * FlowCal talks to its backend exclusively through an object that implements
 * this shape. Two implementations exist (selected at runtime by VITE_BACKEND):
 *
 *   - `supabaseProvider` — talks directly to Supabase from the browser (default).
 *   - `apiProvider`      — talks to a self-hosted Express + Postgres API. (Phase 3)
 *
 * Keeping every backend call behind this seam means the rest of the app never
 * imports `supabase` directly, so swapping backends is a one-line env change.
 *
 * @typedef {Object} Session
 * @property {{ id: string, email: string }} [user]
 *
 * @typedef {Object} AuthResult   Mirrors Supabase's `{ data, error }` contract.
 * @property {any}   [data]
 * @property {Error} [error]
 *
 * @typedef {Object} BackendProvider
 *
 * // ── Auth ─────────────────────────────────────────────────────────────
 * @property {() => Promise<Session|null>} getSession
 *           Resolve the current session (or null if signed out).
 * @property {(callback: (session: Session|null) => void) => (() => void)} onAuthStateChange
 *           Subscribe to auth changes. Returns an unsubscribe function.
 * @property {(credentials: { email: string, password: string }) => Promise<AuthResult>} signUp
 * @property {(credentials: { email: string, password: string }) => Promise<AuthResult>} signIn
 * @property {() => Promise<any>} signOut
 * @property {(userId: string) => Promise<Object|null>} getProfile
 *           Full profile row for a user, or null if missing/unreadable.
 * @property {() => Promise<{ signupsEnabled: boolean }>} getAuthConfig
 *           Public auth config for the login page (e.g. whether signups are open).
 *
 * // ── Flows ────────────────────────────────────────────────────────────
 * @property {() => Promise<Array>} listFlows
 * @property {(name?: string, teamId?: string|null) => Promise<Object>} createFlow
 * @property {(id: string) => Promise<Object>} getFlow
 * @property {(id: string, updates: Object) => Promise<Object>} updateFlow
 * @property {(id: string) => Promise<boolean>} deleteFlow
 * @property {(id: string) => Promise<Object>} duplicateFlow
 * @property {() => Promise<Array>} listTemplates
 *           Flows an admin has published as templates (public; browsable by all).
 * @property {(id: string, isTemplate: boolean) => Promise<Object>} setFlowTemplate
 *           Admin-only: publish/unpublish a flow as a shared template.
 *
 * // ── Flow versions ────────────────────────────────────────────────────
 * @property {(flowId: string) => Promise<Array>} listVersions
 * @property {(flowId: string, versionId: string) => Promise<Object>} getVersion
 *           History metadata (id, label, origin, created_at, author), newest first.
 * @property {(flowId: string, label?: string|null) => Promise<Object>} createVersion
 *           Snapshot the flow's current data as a manual version.
 * @property {(flowId: string, versionId: string) => Promise<Object>} restoreVersion
 *           Set the flow's data to the snapshot (non-destructive); returns the updated flow.
 * @property {(flowId: string, versionId: string) => Promise<boolean>} deleteVersion
 *
 * // ── Profile settings (current user) ──────────────────────────────────
 * @property {(userId: string) => Promise<Object|null>} getProfileSettings
 *           `{ full_name, avatar_url, support_access_granted }` for the editable form.
 * @property {(userId: string, updates: { full_name?: string, avatar_url?: string }) => Promise<void>} updateProfile
 * @property {(userId: string, granted: boolean) => Promise<void>} setSupportAccess
 * @property {() => Promise<void>} scheduleAccountDeletion
 *
 * // ── Admin ────────────────────────────────────────────────────────────
 * @property {() => Promise<Array>} listAllUsers
 * @property {() => Promise<Array>} listAllFlows
 * @property {(userId: string, banned: boolean) => Promise<void>} setUserBanned
 */

export {};
