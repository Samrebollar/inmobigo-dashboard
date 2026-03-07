-- FIX INFINITE RECURSION IN RLS (42P17)
-- This script replaces complex nested policies with simple, function-based checks.

BEGIN;

-- 1. Create Helper Function (SECURITY DEFINER to bypass RLS)
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

-- 2. Clean up old/problematic policies
DROP POLICY IF EXISTS "view_org_residents" ON public.residents;
DROP POLICY IF EXISTS "manage_org_residents" ON public.residents;
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.residents;
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.condominiums;

-- 3. Apply Safe Policies for Condominiums
CREATE POLICY "condominiums_isolation_policy" ON public.condominiums
    FOR ALL
    USING (organization_id = get_user_org_id())
    WITH CHECK (organization_id = get_user_org_id());

-- 4. Apply Safe Policies for Residents
CREATE POLICY "residents_isolation_policy" ON public.residents
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
