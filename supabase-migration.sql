-- 1. Volunteers table updates
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS volunteer_type TEXT DEFAULT 'individual';
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS org_name TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS contact_status TEXT DEFAULT 'עדין לא נוצר קשר';

-- 2. Tasks table updates
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS volunteers_assigned INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS requester_name TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS requester_phone TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_type TEXT DEFAULT 'none';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'assigned',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(task_id, volunteer_id)
);

-- 4. Security (RLS)
ALTER TABLE public.volunteers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies DISABLE ROW LEVEL SECURITY;
