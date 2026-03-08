-- ============================================================
-- MIGRATION v2: Group volunteer support
-- Run in Supabase SQL Editor
-- ============================================================

-- Add columns that may be missing
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS school TEXT;

-- New columns for group support
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS volunteer_type TEXT DEFAULT 'individual';
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS org_name TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Ensure RLS is disabled (for prototyping)
ALTER TABLE public.volunteers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies DISABLE ROW LEVEL SECURITY;

-- Verify columns:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'volunteers' ORDER BY ordinal_position;
