
import { createClient } from '@supabase/supabase-js';

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
            const { data, error } = await supabase
                .from('cases')
                .select('status, case_data')
                .eq('id', caseId)
                .eq('user_id', user.sub)
                .single();
            
            if (error) throw error;
            caseResult = data;

        } else {
            const { data, error } = await supabase
                .from('guest_cases')
                .select('status, case_data')
                .eq('id', caseId)
                .single();

            if (error) throw error;
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
        return new Response(JSON.stringify({ error: error.message, status: 'FAILED' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
