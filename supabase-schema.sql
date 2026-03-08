-- Run this script in your Supabase SQL Editor to set up the database

-- 1. Create Volunteers Table
CREATE TABLE IF NOT EXISTS public.volunteers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'available',
    city TEXT,
    vehicle TEXT
);

-- 2. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    location TEXT,
    volunteers_assigned INTEGER DEFAULT 0,
    volunteers_needed INTEGER DEFAULT 1,
    general_help BOOLEAN DEFAULT false
);

-- 3. Create Emergencies Table
CREATE TABLE IF NOT EXISTS public.emergencies (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Disable Row Level Security so the frontend can read/write without authentication 
-- (Great for prototyping, but secure it later if deploying to production with auth)
ALTER TABLE public.volunteers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies DISABLE ROW LEVEL SECURITY;

-- Seed Data (Optional)
INSERT INTO public.tasks (id, type, status, priority, location, volunteers_assigned, volunteers_needed, general_help) 
VALUES 
('ASDF-1', 'הסעות', 'פתוחה', 'בינונית', 'ירושלים, ירושלים', 0, 1, true),
('QWER-2', 'שינוע ציוד', 'בטיפול', 'גבוהה', 'תל אביב', 1, 2, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.volunteers (name, phone, status, city, vehicle) 
VALUES 
('ישראל ישראלי', '050-1234567', 'available', 'ירושלים', 'רכב פרטי'),
('רונית כהן', '054-7654321', 'busy', 'תל אביב', 'קטנוע');
