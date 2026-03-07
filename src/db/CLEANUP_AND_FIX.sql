-- CLEANUP AND FIX SQL (Dynamically Drops ALL Policies)
-- This script removes all RLS policies on 'residents' and 'condominiums' tables, regardless of their names.

BEGIN;

-- 1. Helper Function: Drop All Policies on a Table
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on 'residents'
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'residents' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.residents', r.policyname);
    END LOOP;

    -- Drop all policies on 'condominiums'
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'condominiums' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.condominiums', r.policyname);
    END LOOP;
END $$;

-- 2. Create Security Functions (if not exists or update)
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_access_condominium(condo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.condominiums 
    WHERE id = condo_id 
    AND organization_id = get_user_org_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply NEW Clean Policies
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;

-- NEW Policy for Condominiums
CREATE POLICY "condo_access_policy" ON public.condominiums
    FOR ALL
    USING (organization_id = get_user_org_id())
    WITH CHECK (organization_id = get_user_org_id());

-- NEW Policy for Residents (Using Security Definer Function)
CREATE POLICY "resident_access_policy" ON public.residents
    FOR ALL
    USING (can_access_condominium(condominium_id))
    WITH CHECK (can_access_condominium(condominium_id));

COMMIT;
