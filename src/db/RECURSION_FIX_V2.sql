-- RECURSION FIX V2
-- This script fixes the infinite recursion in organization_users and other tables.

BEGIN;

-- 1. DROP Problematic Policies
DROP POLICY IF EXISTS "Admins can manage organization users" ON public.organization_users;
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.organization_users;
DROP POLICY IF EXISTS "Users can view their own organization links" ON public.organization_users;
DROP POLICY IF EXISTS "users_read_own_org_membership" ON public.organization_users;

-- 2. Helper Functions (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION check_is_org_admin(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_users
    WHERE user_id = auth.uid()
    AND organization_id = target_org_id
    AND role IN ('owner', 'admin', 'admin_condominio', 'admin_propiedad')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_is_any_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'admin_condominio', 'admin_propiedad')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply SAFE Policies to organization_users
-- Policy for SELECT: Users can see their own membership and admins can see everyone in their org.
CREATE POLICY "org_users_select_policy" ON public.organization_users
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        check_is_org_admin(organization_id)
    );

-- Policy for ALL (Insert/Update/Delete): Only admins of the specific org can manage it.
CREATE POLICY "org_users_manage_policy" ON public.organization_users
    FOR ALL
    USING (check_is_org_admin(organization_id))
    WITH CHECK (check_is_org_admin(organization_id));

-- 4. Fix other tables that might be recursive
-- Condominiums
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.condominiums;
DROP POLICY IF EXISTS "org_condos_policy" ON public.condominiums;

CREATE POLICY "condos_org_isolation" ON public.condominiums
    FOR ALL
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

-- Invoices
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.invoices;
CREATE POLICY "invoices_org_isolation" ON public.invoices
    FOR ALL
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

COMMIT;
