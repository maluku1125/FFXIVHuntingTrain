-- Supabase Database Schema
-- This file is idempotent and can be re-run safely.

-- ============================================================
-- 0. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conductor_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    version TEXT,
    server TEXT,
    current_point_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '4 hours') NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false
);

-- REQUIRED for Supabase Realtime to include all column values in payload.new
ALTER TABLE public.rooms REPLICA IDENTITY FULL;

-- Safely add columns for databases created before this schema version
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS server TEXT;

CREATE TABLE IF NOT EXISTS public.points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    point_version TEXT NOT NULL,
    map_name TEXT NOT NULL,
    monster TEXT NOT NULL,
    monster_rank TEXT NOT NULL,
    x NUMERIC NOT NULL,
    y NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 1. Enable RLS
-- ============================================================

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Grants (CRITICAL: without these, anon role cannot query
--    even if RLS policies allow the rows)
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.admins TO anon, authenticated;
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT SELECT ON public.points TO anon, authenticated;

GRANT INSERT, UPDATE ON public.rooms TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.points TO authenticated;

-- ============================================================
-- 3. Policies  (drop first so this file can be re-run safely)
-- ============================================================

-- [ admins ]
DROP POLICY IF EXISTS "Users can read admins" ON public.admins;
CREATE POLICY "Users can read admins" ON public.admins
    FOR SELECT USING (true);

-- [ rooms ] SELECT: public can see published + active + non-expired rooms
DROP POLICY IF EXISTS "Anyone can select published logic active rooms" ON public.rooms;
CREATE POLICY "Anyone can select published logic active rooms" ON public.rooms
    FOR SELECT USING (
        is_published = true AND is_active = true AND expires_at > now()
    );

-- [ rooms ] SELECT: conductor can always see their own rooms (regardless of publish state)
DROP POLICY IF EXISTS "Conductors can read own full rooms" ON public.rooms;
CREATE POLICY "Conductors can read own full rooms" ON public.rooms
    FOR SELECT USING (
        auth.uid() = conductor_id
    );

-- [ rooms ] INSERT: any authenticated user
DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.rooms;
CREATE POLICY "Anyone can insert rooms" ON public.rooms
    FOR INSERT WITH CHECK (auth.uid() = conductor_id);

-- [ rooms ] UPDATE: own room, or admin
DROP POLICY IF EXISTS "Conductors or admins can update rooms" ON public.rooms;
CREATE POLICY "Conductors or admins can update rooms" ON public.rooms
    FOR UPDATE USING (
        auth.uid() = conductor_id OR
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    );

-- [ points ] SELECT: public can read if room is published + active + non-expired
DROP POLICY IF EXISTS "Anyone can select points of valid rooms" ON public.points;
CREATE POLICY "Anyone can select points of valid rooms" ON public.points
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.id = room_id
              AND r.is_published = true
              AND r.is_active = true
              AND r.expires_at > now()
        )
    );

-- [ points ] SELECT: conductor can always read their own room's points
DROP POLICY IF EXISTS "Conductors can read own points" ON public.points;
CREATE POLICY "Conductors can read own points" ON public.points
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.id = room_id AND r.conductor_id = auth.uid()
        )
    );

-- [ points ] INSERT/UPDATE/DELETE: conductor owns the room
DROP POLICY IF EXISTS "Conductors can manage their room points" ON public.points;
CREATE POLICY "Conductors can manage their room points" ON public.points
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.conductor_id = auth.uid())
    );

DROP POLICY IF EXISTS "Conductors can insert points" ON public.points;
CREATE POLICY "Conductors can insert points" ON public.points
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.conductor_id = auth.uid())
    );

-- ============================================================
-- 4. Realtime publication
-- ============================================================

DO $$
BEGIN
    -- Create publication if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add rooms to publication only if not already a member
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;
END $$;
