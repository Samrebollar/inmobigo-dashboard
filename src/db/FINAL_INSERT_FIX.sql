-- FINAL INSERT FIX (Error 42501)
-- This script explicitly allows Owners to insert data by checking the organizations table directly.

BEGIN;

-- 1. Ensure Owners can see their own Organization (Critical for subqueries)
DROP POLICY IF EXISTS "owners_view_own_org" ON public.organizations;
CREATE POLICY "owners_view_own_org" ON public.organizations
    FOR SELECT
    USING (owner_id = auth.uid());

-- 2. Allow Owners to Manage Organization Users (Insert/Update/Delete)
-- This allows the frontend "auto-fix" to actually work and insert the missing row.
DROP POLICY IF EXISTS "owners_manage_org_users" ON public.organization_users;
CREATE POLICY "owners_manage_org_users" ON public.organization_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organizations 
            WHERE organizations.id = organization_users.organization_id 
            AND organizations.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organizations 
            WHERE organizations.id = organization_users.organization_id 
            AND organizations.owner_id = auth.uid()
        )
    );

-- 3. Fix Condominiums Policy to Allow Owners Direct Access
-- We add an OR condition: "If I am listed in organization_users" OR "If I own the organization"
DROP POLICY IF EXISTS "condos_view_org" ON public.condominiums;
DROP POLICY IF EXISTS "safe_manage_condos" ON public.condominiums;

CREATE POLICY "condos_owner_access" ON public.condominiums
    FOR ALL 
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );

COMMIT;
