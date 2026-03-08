import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTasks() {
    const { data, error } = await supabase.from('tasks').select('*').limit(5).order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }
    console.log('Last 5 tasks:', JSON.stringify(data, null, 2));
}

checkTasks();
