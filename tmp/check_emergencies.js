import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: e } = await supabase.from('emergencies').select('*').limit(5);
    console.log('Emergencies:', e?.length || 0);
    if (e?.length > 0) console.log('Emergencies Sample:', JSON.stringify(e, null, 2));
}

check();
