-- FINAL FIX ALL (Nuclear Option)
-- Resolves:
-- 1. Infinite Recursion (42P17) in condominium_users
-- 2. Missing columns (PGRST204) in units
-- 3. RLS permissions for creating units

BEGIN;

-------------------------------------------------------------------------
-- 1. DISABLE RLS TEMPORARILY (Stop the recursion checks while we fix)
-------------------------------------------------------------------------
ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominiums DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominium_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users DISABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------
-- 2. DROP ALL EXISTING POLICIES (Clean slate)
-------------------------------------------------------------------------
DO $$ 
DECLARE 
    r RECORD; 
    tables TEXT[] := ARRAY['units', 'condominiums', 'condominium_users', 'organization_users'];
    t TEXT;
BEGIN 
    FOREACH t IN ARRAY tables LOOP
        FOR r IN SELECT policyname FROM pg_policies WHERE tablename = t LOOP 
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t); 
        END LOOP;
    END LOOP;
END $$;

-------------------------------------------------------------------------
-- 3. APPLY SCHEMA FIXES (Idempotent)
-------------------------------------------------------------------------
-- Units Columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='condominium_id') THEN
        ALTER TABLE public.units ADD COLUMN condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='type') THEN
        ALTER TABLE public.units ADD COLUMN type TEXT DEFAULT 'residential';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='floor') THEN
        ALTER TABLE public.units ADD COLUMN floor TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='status') THEN
        ALTER TABLE public.units ADD COLUMN status TEXT DEFAULT 'vacant';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='unit_number') THEN
        ALTER TABLE public.units ADD COLUMN unit_number TEXT;
    END IF;
    -- Special handling for 'property_id' vs 'condominium_id' mismatch
    -- If 'property_id' exists, we want to get rid of it OR use it as alias. 
    -- Since code uses 'condominium_id', we prefer that. 
    -- If 'property_id' exists and is NOT NULL, it breaks inserts.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='property_id') THEN
        -- If condominium_id ALSO exists (which we added above), drop property_id to avoid confusion/constraint
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='condominium_id') THEN
             ALTER TABLE public.units DROP COLUMN property_id;
        ELSE
             -- If condominium_id doesn't exist (e.g. rename case), rename property_id
             ALTER TABLE public.units RENAME COLUMN property_id TO condominium_id;
        END IF;
    END IF;
END $$;

-------------------------------------------------------------------------
-- 4. APPLY TRIGGERS
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_unit_organization()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL AND NEW.condominium_id IS NOT NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM condominiums
        WHERE id = NEW.condominium_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_unit_organization ON public.units;
CREATE TRIGGER trigger_set_unit_organization
    BEFORE INSERT ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.set_unit_organization();

-------------------------------------------------------------------------
-- 5. RE-ENABLE RLS WITH SAFE, SIMPLE POLICIES
-------------------------------------------------------------------------

-- A) Organization Users (The Root of Truth)
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_users_own" ON public.organization_users
    FOR ALL USING (user_id = auth.uid());

-- B) Condominium Users (The secondary link - Simple Own Check)
ALTER TABLE public.condominium_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "condo_users_own" ON public.condominium_users
    FOR ALL USING (user_id = auth.uid());

-- C) Condominiums (Linked via Org Owner OR Org User)
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "condos_access" ON public.condominiums
    FOR ALL USING (
        -- Owner of the Org
        EXISTS (SELECT 1 FROM organizations WHERE id = condominiums.organization_id AND owner_id = auth.uid())
        OR
        -- Member of the Org
        EXISTS (SELECT 1 FROM organization_users WHERE organization_id = condominiums.organization_id AND user_id = auth.uid())
    );

-- D) Units (Linked via Condominium)
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_access" ON public.units
    FOR ALL USING (
        -- Can view if can view the parent condominium
        -- Rely on RLS of Condominiums table to filter IDs effectively
        condominium_id IN (SELECT id FROM condominiums)
    );

COMMIT;
