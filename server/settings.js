import { query } from './db.js';
import { config } from './config.js';

/**
 * Runtime settings an admin can change from the UI, backed by the app_settings
 * table.
 *
 * Precedence: a stored row wins; with no row, the environment variable is the
 * default. That keeps env-only deployments working exactly as before (nobody
 * has to run the UI to get the behaviour they configured), while letting an
 * admin take over a setting at runtime without a redeploy.
 *
 * Note the consequence, deliberately: once an admin flips a setting in the UI,
 * the env var no longer decides it. `SIGNUPS_ENABLED` seeds the default, it is
 * not a hard lock. If you need signups closed no matter what, close them here
 * *and* leave the env var false, or don't grant admin to people you don't trust
 * with it.
 */

export const SETTING_SIGNUPS_ENABLED = 'signups_enabled';

/** Read a stored setting, or `undefined` when the admin has never set it. */
async function readSetting(key) {
    const { rows } = await query('select value from app_settings where key = $1', [key]);
    return rows[0]?.value;
}

/**
 * Are new registrations open? Stored value wins; env var is the default.
 * @returns {Promise<boolean>}
 */
export async function getSignupsEnabled() {
    const stored = await readSetting(SETTING_SIGNUPS_ENABLED);
    if (stored === undefined || stored === null) return config.signupsEnabled;
    return stored === true;
}

/**
 * Open or close registrations. Persists, so it survives restarts and applies to
 * every instance sharing the database.
 * @param {boolean} enabled
 * @param {string} [adminId] who changed it, for the audit trail
 */
export async function setSignupsEnabled(enabled, adminId) {
    await query(
        `insert into app_settings (key, value, updated_by)
         values ($1, $2::jsonb, $3)
         on conflict (key) do update
            set value = excluded.value,
                updated_at = now(),
                updated_by = excluded.updated_by`,
        [SETTING_SIGNUPS_ENABLED, JSON.stringify(!!enabled), adminId || null]
    );
    return !!enabled;
}

/** The effective settings plus where each value came from (for the admin UI). */
export async function getEffectiveSettings() {
    const stored = await readSetting(SETTING_SIGNUPS_ENABLED);
    const isStored = stored !== undefined && stored !== null;
    return {
        signupsEnabled: isStored ? stored === true : config.signupsEnabled,
        // Lets the UI be honest about whether it is showing an admin's choice or
        // the deployment's default.
        signupsSource: isStored ? 'database' : 'environment',
    };
}
