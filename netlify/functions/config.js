
export default async () => {
    const config = {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    };

    return new Response(JSON.stringify(config), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
    });
};
