
import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;
let initializePromise = null;

async function initializeSupabase() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorBody.error || `Failed to fetch configuration from server.`);
        }
        const config = await response.json();

        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error("Invalid Supabase configuration received from server.");
        }

        supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
        return supabaseInstance;
    } catch (error) {
        throw error;
    }
}

export function getSupabase() {
    if (!initializePromise) {
        initializePromise = initializeSupabase();
    }
    return initializePromise;
}
