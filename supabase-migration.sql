-- ============================================================
-- MIGRATION: Add gender column to volunteers table (safe)
-- Run this in Supabase SQL Editor if the table already exists
-- ============================================================

-- Add gender column if it doesn't exist
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS gender TEXT;

-- Also add notes column if it doesn't exist (may be missing in older tables)
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Also ensure school column exists (legacy, kept for compatibility)
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS school TEXT;

-- Full Re-create (only use this if starting fresh - it drops all existing data)
-- DROP TABLE IF EXISTS public.assignments;
-- DROP TABLE IF EXISTS public.volunteers;

-- ============================================================
-- Verify the column exists after running:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'volunteers' AND column_name = 'gender';
-- ============================================================
