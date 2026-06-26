import { supabaseProvider } from './supabaseProvider';

/**
 * Active backend provider, chosen by the VITE_BACKEND env var.
 *
 *   VITE_BACKEND=supabase   → Supabase (default)
 *   VITE_BACKEND=api        → self-hosted Express + Postgres API (Phase 3)
 *
 * The rest of the app imports `backend` from here and never touches a
 * concrete backend client directly. See ./provider.types.js for the contract.
 */
const providers = {
    supabase: supabaseProvider,
    // api: apiProvider,  // added in Phase 3
};

const selected = import.meta.env.VITE_BACKEND || 'supabase';
const backend = providers[selected];

if (!backend) {
    throw new Error(
        `Unknown VITE_BACKEND "${selected}". ` +
        `Available backends: ${Object.keys(providers).join(', ')}.`
    );
}

export { backend };
