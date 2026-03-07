-- UNITS CREATION FIX
-- 1. Add missing columns to 'units' table
-- 2. Validate 'organization_id' via Trigger (since frontend doesn't send it)
-- 3. Update RLS to allow creation based on condominium access

BEGIN;

-- 1. ADD MISSING COLUMNS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='condominium_id') THEN
        ALTER TABLE public.units ADD COLUMN condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='type') THEN
        ALTER TABLE public.units ADD COLUMN type TEXT DEFAULT 'residential';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='size_m2') THEN
        ALTER TABLE public.units ADD COLUMN size_m2 NUMERIC(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='floor') THEN
        ALTER TABLE public.units ADD COLUMN floor TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='status') THEN
        ALTER TABLE public.units ADD COLUMN status TEXT DEFAULT 'vacant';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='unit_number') THEN
        ALTER TABLE public.units ADD COLUMN unit_number TEXT;
    END IF;
END $$;

-- 2. TRIGGER TO AUTO-POPULATE ORGANIZATION_ID
-- This ensures that even if frontend sends null, we fill it from the condo relation.
CREATE OR REPLACE FUNCTION public.set_unit_organization()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL AND NEW.condominium_id IS NOT NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM condominiums
        WHERE id = NEW.condominium_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_unit_organization ON public.units;
CREATE TRIGGER trigger_set_unit_organization
    BEFORE INSERT ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.set_unit_organization();

-- Relax RLS to allow insertion via condominium_id
-- Explicitly drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view units in their organization" ON public.units;
DROP POLICY IF EXISTS "Admins can manage units" ON public.units;
DROP POLICY IF EXISTS "units_view_policy" ON public.units;
DROP POLICY IF EXISTS "units_manage_policy" ON public.units;

-- View Policy (Read)
CREATE POLICY "units_view_policy" ON public.units
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
        OR
        condominium_id IN (
            SELECT id FROM condominiums WHERE organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            )
        )
    );

-- Manage Policy (Insert/Update/Delete)
CREATE POLICY "units_manage_policy" ON public.units
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND (
                organization_id = units.organization_id
                OR
                organization_id = (SELECT organization_id FROM condominiums WHERE id = units.condominium_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND (
                organization_id = units.organization_id -- This might be null on check? Checks happen after trigger? No, before constraint, but after trigger?
                -- Triggers (BEFORE INSERT) run BEFORE constraints. RLS WITH CHECK runs... it depends. 
                -- To be safe, we rely on the subquery to condominiums
                OR
                organization_id = (SELECT organization_id FROM condominiums WHERE id = units.condominium_id)
            )
        )
    );

-- 4. FORCE NULLABLE ORGANIZATION_ID TEMPORARILY
-- If organization_users trigger works, we don't *technically* need this if we pass a dummy value, 
-- but to be safe against "Not Null" constraint failing before Trigger (which shouldn't happen, but Postgres flow is specific),
-- validation of NOT NULL happens AFTER Before Triggers. So we SHOULD be fine. 
-- BUT, RLS Check happens with the data *as provided*.
-- If 'organization_id' is NULL provided, 'units.organization_id' in WITH CHECK might be NULL.
-- The clause `organization_id = (SELECT... WHERE id = units.condominium_id)` handles the look up.

COMMIT;
