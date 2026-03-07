-- FIX RESIDENTS SCHEMA
-- Adds missing columns to align with frontend types (Resident interface)

BEGIN;

-- 1. Ensure 'residents' table exists if not (Safety net)
CREATE TABLE IF NOT EXISTS public.residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add columns if missing
DO $$ 
BEGIN 
    -- first_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='first_name') THEN
        ALTER TABLE public.residents ADD COLUMN first_name TEXT;
    END IF;

    -- last_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='last_name') THEN
        ALTER TABLE public.residents ADD COLUMN last_name TEXT;
    END IF;

    -- email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='email') THEN
        ALTER TABLE public.residents ADD COLUMN email TEXT;
    END IF;

    -- phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='phone') THEN
        ALTER TABLE public.residents ADD COLUMN phone TEXT;
    END IF;

    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='status') THEN
        ALTER TABLE public.residents ADD COLUMN status TEXT DEFAULT 'active'; -- 'active', 'inactive', 'delinquent'
    END IF;

    -- debt_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='debt_amount') THEN
        ALTER TABLE public.residents ADD COLUMN debt_amount NUMERIC(10, 2) DEFAULT 0;
    END IF;

    -- unit_id (Optional link to units table)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='unit_id') THEN
        ALTER TABLE public.residents ADD COLUMN unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;
    END IF;

END $$;

-- 3. Enable RLS (Just in case)
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies (Safe & Simple)
DO $$ 
BEGIN 
    -- Drop old policies to be safe
    PERFORM 1 FROM pg_policies WHERE tablename = 'residents' AND policyname = 'view_org_residents';
    IF FOUND THEN DROP POLICY "view_org_residents" ON public.residents; END IF;
    
    PERFORM 1 FROM pg_policies WHERE tablename = 'residents' AND policyname = 'manage_org_residents';
    IF FOUND THEN DROP POLICY "manage_org_residents" ON public.residents; END IF;
END $$;

-- Policy: View (Same Org)
CREATE POLICY "view_org_residents" ON public.residents
    FOR SELECT
    USING (
        condominium_id IN (
            SELECT id FROM condominiums WHERE organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Manage (Admins/Staff)
CREATE POLICY "manage_org_residents" ON public.residents
    FOR ALL
    USING (
        condominium_id IN (
            SELECT id FROM condominiums WHERE organization_id IN (
                SELECT organization_id FROM organization_users 
                WHERE user_id = auth.uid() 
                AND role IN ('owner', 'admin', 'staff')
            )
        )
    );

COMMIT;
