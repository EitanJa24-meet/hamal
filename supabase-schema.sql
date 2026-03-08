-- Update Supabase Schema to match the new comprehensive PRD

-- 1. Create Volunteers Table
DROP TABLE IF EXISTS public.assignments;
DROP TABLE IF EXISTS public.volunteers;
CREATE TABLE public.volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    age INTEGER,
    address TEXT,
    city TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    has_car BOOLEAN DEFAULT false,
    skills TEXT[] DEFAULT '{}',
    availability_days TEXT[] DEFAULT '{}',
    availability_hours TEXT,
    emergency_contact TEXT,
    parental_consent_status BOOLEAN DEFAULT false,
    consent_link TEXT,
    insurance_link TEXT,
    notes TEXT,
    status TEXT DEFAULT 'available',
    tasks_completed INTEGER DEFAULT 0,
    last_assigned_date TIMESTAMP WITH TIME ZONE,
    max_travel_radius_km INTEGER DEFAULT 10
);

-- 2. Create Tasks Table
DROP TABLE IF EXISTS public.tasks;
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    address TEXT,
    city TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    urgency TEXT DEFAULT 'medium',
    volunteers_needed INTEGER DEFAULT 1,
    age_limit INTEGER,
    needs_car BOOLEAN DEFAULT false,
    requesting_org TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    internal_notes TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Assignments Table (Many to many mapping)
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'assigned', -- 'assigned', 'confirmed', 'arrived', 'finished'
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(task_id, volunteer_id)
);

-- 4. Create Emergencies Table
DROP TABLE IF EXISTS public.emergencies;
CREATE TABLE public.emergencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Disable Row Level Security so the frontend can read/write without authentication
ALTER TABLE public.volunteers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies DISABLE ROW LEVEL SECURITY;

-- Seed Data
INSERT INTO public.tasks (id, name, type, description, address, city, lat, lng, urgency, volunteers_needed, status)
VALUES
(gen_random_uuid(), 'פינוי רסיסים מדירה', 'ניקוי רסיסים', 'יש לפנות זכוכיות מהדירה לאחר נפילה ציבורית', 'אבן גבירול 10', 'תל אביב', 32.080880, 34.780570, 'high', 3, 'open'),
(gen_random_uuid(), 'בייביסיטר לעובדת רפואה', 'בייביסיטר', 'שמירה על שני ילדים קטנים עקב משמרת בוקר', 'הרצל 50', 'רמת גן', 32.0850, 34.8150, 'medium', 1, 'open');

INSERT INTO public.volunteers (id, full_name, phone, age, address, city, lat, lng, has_car, skills, status)
VALUES
(gen_random_uuid(), 'ישראל ישראלי', '050-1234567', 25, 'דיזנגוף 100', 'תל אביב', 32.0833, 34.7733, true, ARRAY['בייביסיטר', 'לוגיסטיקה'], 'available'),
(gen_random_uuid(), 'רונית כהן', '054-7654321', 32, 'אלנבי 20', 'תל אביב', 32.0667, 34.7667, false, ARRAY['עזרה כללית', 'ניקוי רסיסים'], 'available');
