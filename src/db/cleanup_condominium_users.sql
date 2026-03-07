-- FIX RECURSION IN CONDOMINIUM_USERS
-- The error 42P17 persists because 'condominium_users' likely has a circular policy.

BEGIN;

-- 1. WIPEOUT POLICIES ON condominium_users
DO $$
DECLARE 
    r RECORD;
    has_cu BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'condominium_users') INTO has_cu;
    
    IF has_cu THEN
        -- Disable RLS first
        ALTER TABLE public.condominium_users DISABLE ROW LEVEL SECURITY;

        -- Drop ALL policies
        FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'condominium_users' LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.condominium_users', r.policyname);
        END LOOP;

        -- Re-enable RLS with a single SAFE policy
        ALTER TABLE public.condominium_users ENABLE ROW LEVEL SECURITY;
        EXECUTE 'CREATE POLICY "safe_cu_own" ON public.condominium_users FOR ALL USING (user_id = auth.uid())';
    END IF;
END $$;

-- 2. ENSURE CONDOMINIUMS IS SAFE (AGAIN)
-- Drop all policies to remove potential links to condominium_users
DO $$ 
DECLARE r RECORD;
BEGIN 
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'condominiums' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.condominiums', r.policyname);
    END LOOP;
END $$;

-- Re-create the safe "Organization-based" policy
DROP POLICY IF EXISTS "condos_org_access" ON public.condominiums;
CREATE POLICY "condos_org_access" ON public.condominiums
    FOR ALL 
    USING (
        organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()) OR
        organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    );

COMMIT;
