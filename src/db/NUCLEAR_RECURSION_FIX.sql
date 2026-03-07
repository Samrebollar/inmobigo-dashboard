-- NUCLEAR RECURSION FIX (42P17)
-- This script drops ALL policies on related tables and re-applies a simplified, function-based strategy.

BEGIN;

-- 1. DROP ALL EXISTING POLICIES (To ensure no conflicts)
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.condominiums;
DROP POLICY IF EXISTS "condominiums_isolation_policy" ON public.condominiums;
DROP POLICY IF EXISTS "view_org_condos" ON public.condominiums;

DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.residents;
DROP POLICY IF EXISTS "view_org_residents" ON public.residents;
DROP POLICY IF EXISTS "manage_org_residents" ON public.residents;
DROP POLICY IF EXISTS "residents_isolation_policy" ON public.residents;

DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.organization_users;
DROP POLICY IF EXISTS "Admins can manage organization users" ON public.organization_users;
DROP POLICY IF EXISTS "org_users_isolation_policy" ON public.organization_users;

-- 2. Ensure Helper Function is SECURITY DEFINER (Crucial for breaking recursion)
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

-- 3. Apply Direct, Non-Recursive Policies

-- ORGANIZATION_USERS (Base Table)
-- Users can read their own row to know their Org.
CREATE POLICY "users_read_own_org_membership" ON public.organization_users
    FOR SELECT
    USING (user_id = auth.uid());

-- CONDOMINIUMS
-- Users can see condos that belong to their Org ID (via function)
CREATE POLICY "org_condos_policy" ON public.condominiums
    FOR ALL
    USING (organization_id = get_user_org_id())
    WITH CHECK (organization_id = get_user_org_id());

-- RESIDENTS
-- Users can see residents linked to condos of their Org (via function + simple Join/Subquery)
-- Using the function prevents checking organization_users table directly within this policy
CREATE POLICY "org_residents_policy" ON public.residents
    FOR ALL
    USING (
        condominium_id IN (
            SELECT id FROM public.condominiums WHERE organization_id = get_user_org_id()
        )
    )
    WITH CHECK (
        condominium_id IN (
            SELECT id FROM public.condominiums WHERE organization_id = get_user_org_id()
        )
    );

COMMIT;
