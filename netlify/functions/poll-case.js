
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async (req, context) => {
    const { user } = context.identityContext || {};
    const params = new URL(req.url).searchParams;
    const caseId = params.get('caseId');
    const userType = params.get('userType');

    if (!caseId || !userType) {
        return new Response(JSON.stringify({ error: "Missing caseId or userType" }), { status: 400 });
    }

    try {
        let caseResult;
        if (userType === 'auth') {
            if (!user) return new Response(JSON.stringify({ error: "User not authenticated for this case type." }), { status: 401 });
            
            const { data, error } = await supabase
                .from('cases')
                .select('status, case_data')
                .eq('id', caseId)
                .eq('user_id', user.sub) // RLS check for ownership
                .single();
            
            if (error) throw new Error(`Supabase auth poll error: ${error.message}`);
            caseResult = data;

        } else { // guest
            const { data, error } = await supabase
                .from('guest_cases')
                .select('status, case_data')
                .eq('id', caseId)
                .single();

            if (error) throw new Error(`Supabase guest poll error: ${error.message}`);
            caseResult = data;
        }

        if (!caseResult) {
            return new Response(JSON.stringify({ error: "Case not found." }), { status: 404 });
        }

        return new Response(JSON.stringify(caseResult), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error(`Error polling case ${caseId}:`, error);
        return new Response(JSON.stringify({ error: error.message, status: 'FAILED' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
