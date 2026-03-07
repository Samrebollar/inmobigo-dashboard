-- Schema Repair: Ensure all columns exist in condominiums

-- 1. Add missing columns if they don't exist
DO $$ 
BEGIN 
    -- Basic Info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='slug') THEN
        ALTER TABLE public.condominiums ADD COLUMN slug TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='type') THEN
        ALTER TABLE public.condominiums ADD COLUMN type TEXT CHECK (type IN ('residential', 'commercial', 'mixed')) DEFAULT 'residential';
    END IF;

    -- Address Info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='address') THEN
        ALTER TABLE public.condominiums ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='state') THEN
        ALTER TABLE public.condominiums ADD COLUMN state TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='city') THEN
        ALTER TABLE public.condominiums ADD COLUMN city TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='country') THEN
        ALTER TABLE public.condominiums ADD COLUMN country TEXT DEFAULT 'México';
    END IF;

    -- Financial / Technical Info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='units_total') THEN
        ALTER TABLE public.condominiums ADD COLUMN units_total INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='billing_day') THEN
        ALTER TABLE public.condominiums ADD COLUMN billing_day INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='currency') THEN
        ALTER TABLE public.condominiums ADD COLUMN currency TEXT DEFAULT 'MXN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condominiums' AND column_name='status') THEN
        ALTER TABLE public.condominiums ADD COLUMN status TEXT CHECK (status IN ('active', 'paused')) DEFAULT 'active';
    END IF;

END $$;

-- 2. Verify organization_users columns for RBAC
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_users' AND column_name='role') THEN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
            ALTER TABLE public.organization_users ADD COLUMN role role_type DEFAULT 'admin';
        ELSE
            ALTER TABLE public.organization_users ADD COLUMN role TEXT DEFAULT 'admin';
        END IF;
    END IF;
END $$;
