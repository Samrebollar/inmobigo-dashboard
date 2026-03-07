-- FIX ALL RLS POLICIES (Comprehensive & Safe)
-- This script ensures ALL critical tables have correct RLS policies.

BEGIN;

-- 1. Helper Function: Get User Org ID (SECURITY DEFINER)
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

-- 2. Helper Function: Check Condominium Access (SECURITY DEFINER)
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

-- 3. ORGANIZATION_USERS Table (CRITICAL FIX)
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "users_read_own_org_membership" ON public.organization_users;
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.organization_users;
DROP POLICY IF EXISTS "Admins can manage organization users" ON public.organization_users;
DROP POLICY IF EXISTS "org_users_isolation_policy" ON public.organization_users;

-- Create NEW Policy: Users can read their own row (to determine role/org)
CREATE POLICY "users_read_own_membership" ON public.organization_users
    FOR SELECT
    USING (user_id = auth.uid());

-- Create NEW Policy: Admins can manage users in their org
CREATE POLICY "admins_manage_org_users" ON public.organization_users
    FOR ALL
    USING (
        organization_id = get_user_org_id() 
        AND EXISTS (
            SELECT 1 FROM organization_users 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- 4. CONDOMINIUMS Table
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.condominiums;
DROP POLICY IF EXISTS "condominiums_isolation_policy" ON public.condominiums;
DROP POLICY IF EXISTS "org_condos_policy" ON public.condominiums;
DROP POLICY IF EXISTS "condo_access_policy" ON public.condominiums;

-- Create NEW Policy
CREATE POLICY "condo_access_policy" ON public.condominiums
    FOR ALL
    USING (organization_id = get_user_org_id())
    WITH CHECK (organization_id = get_user_org_id());

-- 5. RESIDENTS Table
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.residents;
DROP POLICY IF EXISTS "residents_isolation_policy" ON public.residents;
DROP POLICY IF EXISTS "org_residents_policy" ON public.residents;
DROP POLICY IF EXISTS "view_org_residents" ON public.residents;
DROP POLICY IF EXISTS "resident_access_policy" ON public.residents;

-- Create NEW Policy (Using Function)
CREATE POLICY "resident_access_policy" ON public.residents
    FOR ALL
    USING (can_access_condominium(condominium_id))
    WITH CHECK (can_access_condominium(condominium_id));

COMMIT;
