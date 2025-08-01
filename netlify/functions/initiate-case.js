
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async (req, context) => {
    try {
        const { user } = context.identityContext || {};
        let caseRecord;
        let userType;

        if (user) {
            userType = 'auth';
            const { data, error } = await supabase
                .from('cases')
                .insert({ user_id: user.sub, status: 'PENDING' })
                .select('id')
                .single();
            if (error) throw error;
            caseRecord = data;
        } else {
            userType = 'guest';
            const { data, error } = await supabase
                .from('guest_cases')
                .insert({ status: 'PENDING' })
                .select('id')
                .single();
            if (error) throw error;
            caseRecord = data;
        }

        return new Response(JSON.stringify({ caseId: caseRecord.id, userType }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
