-- FINAL DB FIX: SECURITY DEFINER FUNCTIONS
-- This script moves permission logic into trusted functions to strictly break RLS recursion.

BEGIN;

-- 1. Helper: Get User Org ID (Already exists, but ensuring it is secure)
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

-- 2. Helper: Check Condominium Access (Trusted Context)
-- Returns TRUE if the current user belongs to the org that owns the condo.
-- executing as owner (postgres) bypasses the RLS on 'condominiums' table inside this check.
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

-- 3. Drop all potentially conflicting policies
-- Condominiums
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.condominiums;
DROP POLICY IF EXISTS "condominiums_isolation_policy" ON public.condominiums;
DROP POLICY IF EXISTS "org_condos_policy" ON public.condominiums;
-- Residents
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.residents;
DROP POLICY IF EXISTS "residents_isolation_policy" ON public.residents;
DROP POLICY IF EXISTS "org_residents_policy" ON public.residents;
DROP POLICY IF EXISTS "view_org_residents" ON public.residents;
DROP POLICY IF EXISTS "manage_org_residents" ON public.residents;

-- 4. Apply Function-Based Policies (Recursion Proof)

-- CONDOMINIUMS
-- Simple check: Does the Org ID match?
CREATE POLICY "policy_condos_isolation" ON public.condominiums
    FOR ALL
    USING (organization_id = get_user_org_id())
    WITH CHECK (organization_id = get_user_org_id());

-- RESIDENTS
-- Uses the SECURITY DEFINER function to verify the condominium link
-- This prevents the policy from triggering a recursive RLS check on the condominiums table
CREATE POLICY "policy_residents_isolation" ON public.residents
    FOR ALL
    USING (can_access_condominium(condominium_id))
    WITH CHECK (can_access_condominium(condominium_id));

COMMIT;
