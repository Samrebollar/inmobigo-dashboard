-- FINAL CONSOLIDATED DATABASE FIX
-- This script fixes BOTH the "infinite recursion" (Error 42P17) and the missing columns (Error PGRST204)

---------------------------------------------------------
-- 1. CLEANUP OLD POLICIES (DROP EVERYTHING PROBLEMATIC)
---------------------------------------------------------

-- Drop all possible policies that might be causing recursion
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.organization_users;
DROP POLICY IF EXISTS "Admins can manage organization users" ON public.organization_users;
DROP POLICY IF EXISTS "Users can view their own organization links" ON public.organization_users;
DROP POLICY IF EXISTS "Admins can manage their organization users" ON public.organization_users;

DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.condominiums;
DROP POLICY IF EXISTS "Enable manage for admins of the same organization" ON public.condominiums;

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

---------------------------------------------------------
-- 2. SCHEMA REPAIR (ENSURE ALL COLUMNS EXIST)
---------------------------------------------------------

DO $$ 
BEGIN 
    -- Condominiums Columns
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

    -- Organization Users Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_users' AND column_name='role') THEN 
        ALTER TABLE public.organization_users ADD COLUMN role TEXT DEFAULT 'admin'; 
    END IF;
END $$;

---------------------------------------------------------
-- 3. DEFINE SAFE NON-RECURSIVE POLICIES
---------------------------------------------------------

-- A. Organization Users: Simplest possible check to break loops
-- Users can see their own memberships
CREATE POLICY "safe_view_own_org_users" ON public.organization_users
    FOR SELECT USING (user_id = auth.uid());

-- Admins can manage organization_users (using PROFILES as a separate lookup)
CREATE POLICY "safe_admin_manage_org_users" ON public.organization_users
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- B. Condominiums: Uses organization_users as the link
CREATE POLICY "safe_manage_condos" ON public.condominiums
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

-- C. Profiles: Ensure it's not recursive
CREATE POLICY "safe_view_profiles" ON public.profiles
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
    );

---------------------------------------------------------
-- 4. FINAL REFRESH
---------------------------------------------------------
-- Si el error PGRST204 (Cache) persiste, realiza un cambio manual en Supabase Dashboard.
