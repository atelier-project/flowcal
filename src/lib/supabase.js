import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The provider selector imports this module even when VITE_BACKEND=api, so we
// must NOT construct the client (which throws on a missing URL) at load time
// unless Supabase is actually configured. When it isn't, export a stub that
// only errors if something genuinely tries to use the Supabase backend.
function createUnconfiguredStub() {
    return new Proxy(
        {},
        {
            get() {
                throw new Error(
                    'Supabase backend selected but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
                    'Set them, or use VITE_BACKEND=api for the self-hosted backend.'
                );
            },
        }
    );
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createUnconfiguredStub();
