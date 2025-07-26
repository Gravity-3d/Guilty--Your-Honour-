export default async () => {
    // This function securely provides the public, client-side Supabase credentials.
    // These environment variables are set in the Netlify build environment.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Server configuration error: SUPABASE_URL or SUPABASE_ANON_KEY is not set in the environment variables.");
        const errorResponse = {
            error: "Server is not configured correctly. Required environment variables are missing."
        };
        return new Response(JSON.stringify(errorResponse), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }

    const config = {
        supabaseUrl,
        supabaseAnonKey,
    };

    return new Response(JSON.stringify(config), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
    });
};
