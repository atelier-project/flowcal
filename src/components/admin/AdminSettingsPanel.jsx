import React, { useEffect, useState } from 'react';
import { backend } from '../../services/backend';
import { UserPlus, Loader2, Lock, Unlock, AlertTriangle } from 'lucide-react';

/**
 * Admin controls that aren't per-user or per-flow: open/close registration, and
 * add an account directly.
 *
 * Both are backend-dependent. The self-hosted `api` backend owns its own auth,
 * so it can do these. The Supabase backend cannot — creating users and changing
 * auth settings need service-role privileges a browser must never hold — so the
 * provider reports `readOnly` and we say so plainly rather than showing a button
 * that quietly does nothing.
 */
export function AdminSettingsPanel({ isSuperuser, onUserCreated }) {
    const [settings, setSettings] = useState(null);
    const [savingSignups, setSavingSignups] = useState(false);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({ email: '', password: '', role: 'user' });
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState(null);

    useEffect(() => {
        backend.getAdminSettings().then(setSettings).catch((e) => setError(e.message));
    }, []);

    const readOnly = settings?.readOnly;

    const toggleSignups = async () => {
        if (!settings || readOnly) return;
        setSavingSignups(true);
        setError(null);
        try {
            setSettings(await backend.setSignupsEnabled(!settings.signupsEnabled));
        } catch (e) {
            setError(e.message);
        } finally {
            setSavingSignups(false);
        }
    };

    const submitNewUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError(null);
        setCreated(null);
        try {
            const user = await backend.createUserAsAdmin(form);
            setCreated(user.email);
            setForm({ email: '', password: '', role: 'user' });
            onUserCreated?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const card = 'bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm';
    const input = 'w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Registration */}
            <div className={card}>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Registration</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Whether new people can sign themselves up. Existing users can always sign in.
                </p>

                {!settings ? (
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                {settings.signupsEnabled
                                    ? <Unlock size={18} className="text-green-600" />
                                    : <Lock size={18} className="text-red-500" />}
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                    Sign-ups are {settings.signupsEnabled ? 'open' : 'closed'}
                                </span>
                            </div>
                            <button
                                onClick={toggleSignups}
                                disabled={savingSignups || readOnly}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${settings.signupsEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {savingSignups
                                    ? <Loader2 className="animate-spin" size={14} />
                                    : settings.signupsEnabled ? 'Close sign-ups' : 'Open sign-ups'}
                            </button>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-3">
                            {readOnly
                                ? 'Set by VITE_SIGNUPS_ENABLED at build time. On the Supabase backend, change this in the Supabase dashboard (Authentication → Providers).'
                                : settings.signupsSource === 'environment'
                                    ? 'Currently the SIGNUPS_ENABLED environment default. Toggling stores a setting here, which then takes precedence over it.'
                                    : 'Set here by an admin — this overrides the SIGNUPS_ENABLED environment variable.'}
                        </p>
                    </>
                )}
            </div>

            {/* Add a user */}
            <div className={card}>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                    <UserPlus size={18} className="text-blue-600" /> Add a user
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Creates the account directly — works even while sign-ups are closed. They can sign in immediately.
                </p>

                <form onSubmit={submitNewUser} className="space-y-2">
                    <input
                        type="email"
                        required
                        autoComplete="off"
                        placeholder="email@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={input}
                        disabled={readOnly}
                    />
                    <input
                        type="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Temporary password (min 6 characters)"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className={input}
                        disabled={readOnly}
                    />
                    {isSuperuser && (
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className={input}
                            disabled={readOnly}
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    )}
                    <button
                        type="submit"
                        disabled={creating || readOnly}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        {creating ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
                        Create user
                    </button>
                </form>

                {created && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">Created {created}.</p>
                )}
                {readOnly && (
                    <p className="text-[11px] text-slate-400 mt-2">
                        Not available on the Supabase backend — add users in the Supabase dashboard.
                    </p>
                )}
            </div>

            {error && (
                <div className="md:col-span-2 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
