import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: v } = await supabase.from('volunteers').select('*').limit(5);
    const { data: t } = await supabase.from('tasks').select('*').limit(5);
    console.log('Volunteers:', v?.length || 0);
    console.log('Tasks:', t?.length || 0);
    if (t?.length > 0) console.log('Tasks Sample:', JSON.stringify(t, null, 2));
}

check();
