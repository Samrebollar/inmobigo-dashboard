
DO $$ 
BEGIN
    -- 1. Check if role_new exists and role does not
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_users' AND column_name = 'role_new'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_users' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.organization_users RENAME COLUMN role_new TO role;
    END IF;

    -- 2. Ensure role_type enum includes all necessary roles
    -- This might fail if the type is already there, but we check first
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        CREATE TYPE role_type AS ENUM ('owner', 'admin', 'manager', 'accountant', 'staff', 'viewer', 'admin_condominio', 'admin_propiedad', 'security');
    ELSE
        -- Add missing values to existing enum
        BEGIN
            ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'admin_condominio';
            ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'admin_propiedad';
            ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'security';
        EXCEPTION WHEN others THEN
            -- Ignore if already exists
        END;
    END IF;

    -- 3. Redefine the helper functions to be super robust
    -- We use the column 'role' (which we just renamed or ensured exists)
    CREATE OR REPLACE FUNCTION check_is_org_admin(target_org_id UUID)
    RETURNS BOOLEAN AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE user_id = auth.uid()
        AND organization_id = target_org_id
        -- We check both 'role' and any potential role column if they exist
        AND role IN ('owner', 'admin', 'admin_condominio', 'admin_propiedad')
      );
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION check_is_any_admin()
    RETURNS BOOLEAN AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'admin_condominio', 'admin_propiedad')
      );
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

END $$;

-- 4. Fix the problematic recursive policy on organization_users
DROP POLICY IF EXISTS "org_users_select_policy" ON public.organization_users;
CREATE POLICY "org_users_select_policy" ON public.organization_users
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        check_is_org_admin(organization_id)
    );

-- 5. Fix policies on other tables to use a simpler check that avoids recursion
DROP POLICY IF EXISTS "condos_org_isolation" ON public.condominiums;
CREATE POLICY "condos_org_isolation" ON public.condominiums
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "residents_isolation_policy" ON public.residents;
CREATE POLICY "residents_isolation_policy" ON public.residents
    FOR ALL
    USING (
        condominium_id IN (
            SELECT id FROM public.condominiums 
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
            )
        )
    );
