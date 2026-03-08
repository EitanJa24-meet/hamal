-- ============================================================
-- 🚀 FULL MIGRATION: RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================

-- 1. Ensure Volunteers table has all needed columns
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS volunteer_type TEXT DEFAULT 'individual';
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS org_name TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 2. Ensure Tasks table has volunteers_assigned count if needed (though we use assignments table)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS volunteers_assigned INTEGER DEFAULT 0;

-- 3. Create Assignments table if missing (for many-to-many linking)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'assigned',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(task_id, volunteer_id)
);

-- 4. Disable RLS for all tables to allow frontend access
ALTER TABLE public.volunteers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- ✅ DONE. Your database is now compatible with the new code.
-- ============================================================
