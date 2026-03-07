-- RLS Recursion Fix
-- This script fixes the "infinite recursion" error in organization_users and other relations

-- 1. Drop the problematic recursive policies from rbac_schema.sql
-- Note: These policies call get_user_org_id(), which queries organization_users, causing a loop.

-- Fix for organization_users
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.organization_users;
DROP POLICY IF EXISTS "Admins can manage organization users" ON public.organization_users;

-- Fix for condominium_users (in case it exists in your DB)
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.condominium_users;
DROP POLICY IF EXISTS "Admins can manage condominium users" ON public.condominium_users;

-- 2. Create NEW SAFE policies for organization_users (No self-reference)
CREATE POLICY "Users can view their own organization links" ON public.organization_users
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage their organization users" ON public.organization_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 3. If condominium_users exists, apply safe policies there too
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'condominium_users') THEN
        CREATE POLICY "Users can view their own condo links" ON public.condominium_users
            FOR SELECT
            USING (user_id = auth.uid());
    END IF;
END $$;

-- 4. Verify condominiums policies (These are usually safe but let's ensure they use a safe lookup)
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.condominiums;
CREATE POLICY "Enable access for users of the same organization" ON public.condominiums
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
    );

-- 5. Fix profiles if needed (Ensure they don't depend on organization_users recursivly)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization" ON public.profiles
    FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    ));
