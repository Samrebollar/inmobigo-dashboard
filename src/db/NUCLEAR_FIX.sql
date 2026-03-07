-- NUCLEAR FIX: WIPE ALL POLICIES AND REBUILD
-- This script dynamically drops ALL policies on the affected tables to ensure no recursive logic remains.

BEGIN;

-- 1. DROP THE PROBLEMATIC FUNCTION (Source of recursion)
DROP FUNCTION IF EXISTS public.get_user_org_id();

-- 2. DISABLE RLS TEMPORARILY (To unblock immediate access if needed)
ALTER TABLE public.organization_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominiums DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. DROP *ALL* POLICIES ON RELEVANT TABLES (Dynamic SQL to catch any name)
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Drop policies for organization_users
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.organization_users';
    END LOOP;

    -- Drop policies for condominiums
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'condominiums') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.condominiums';
    END LOOP;

    -- Drop policies for profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- 4. RE-ENABLE RLS
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. ENSURE COLUMNS EXIST (Schema Repair)
DO $$ 
BEGIN 
    -- Condominiums
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='slug') THEN ALTER TABLE public.condominiums ADD COLUMN slug TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='type') THEN ALTER TABLE public.condominiums ADD COLUMN type TEXT DEFAULT 'residential'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='address') THEN ALTER TABLE public.condominiums ADD COLUMN address TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='state') THEN ALTER TABLE public.condominiums ADD COLUMN state TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='city') THEN ALTER TABLE public.condominiums ADD COLUMN city TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='country') THEN ALTER TABLE public.condominiums ADD COLUMN country TEXT DEFAULT 'México'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='units_total') THEN ALTER TABLE public.condominiums ADD COLUMN units_total INTEGER DEFAULT 0; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='billing_day') THEN ALTER TABLE public.condominiums ADD COLUMN billing_day INTEGER DEFAULT 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='currency') THEN ALTER TABLE public.condominiums ADD COLUMN currency TEXT DEFAULT 'MXN'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='status') THEN ALTER TABLE public.condominiums ADD COLUMN status TEXT DEFAULT 'active'; END IF;

    -- Organization Users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_users' AND column_name='role') THEN 
        ALTER TABLE public.organization_users ADD COLUMN role TEXT DEFAULT 'admin'; 
    END IF;
END $$;

-- 6. CREATE SAFE, NON-RECURSIVE POLICIES

-- A. Organization Users (SIMPLEST CHECK: User ID match)
CREATE POLICY "org_users_view_own" ON public.organization_users
    FOR SELECT USING (user_id = auth.uid());

-- B. Condominiums (LINK VIA ORGANIZATION_USERS - NO RECURSION)
-- We query organization_users directly. Since org_users policy is effectively "user_id = auth.uid", this is safe.
CREATE POLICY "condos_view_org" ON public.condominiums
    FOR ALL 
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
    );

-- C. Profiles (SIMPLE USER CHECK)
CREATE POLICY "profiles_view_own" ON public.profiles
    FOR ALL USING (id = auth.uid());
    
CREATE POLICY "profiles_view_org" ON public.profiles
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
    );

COMMIT;
