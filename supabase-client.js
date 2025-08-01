


import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;
let initializePromise = null;

async function initializeSupabase() {
    // This function is called only once to fetch the config and create the client.
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            // Try to parse the error body from the server for a more specific message
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
        console.error("Failed to initialize Supabase client:", error);
        // Re-throw so callers can handle the UI feedback (e.g., show an error message).
        throw error;
    }
}

/**
 * Returns a promise that resolves with the singleton Supabase client instance.
 * Handles fetching configuration and initialization on the first call.
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export function getSupabase() {
    if (!initializePromise) {
        initializePromise = initializeSupabase();
    }
    return initializePromise;
}