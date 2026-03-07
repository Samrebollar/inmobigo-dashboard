-- MIGRATION: VEHICLES TABLE
-- Creates a table to store resident vehicles linked to the 'residents' table.

-- 1. Create 'vehicles' table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    plate TEXT NOT NULL,
    brand TEXT, -- Optional: Marca/Modelo (e.g. "Toyota Corolla")
    color TEXT, -- Optional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.5 Ensure 'staff' role exists in enum (Fix for 22P02)
DO $$
BEGIN
    ALTER TYPE role_type ADD VALUE 'staff';
EXCEPTION
    WHEN duplicate_object THEN null; -- Ignore if already exists
    WHEN others THEN null; -- Handle other issues gracefully
END $$;

-- 2. Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Policy: Users can view vehicles of residents in their organization
CREATE POLICY "view_organization_vehicles" ON public.vehicles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM residents
            WHERE residents.id = vehicles.resident_id
            AND residents.condominium_id IN (
                SELECT id FROM condominiums WHERE organization_id IN (
                    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                )
            )
        )
    );

-- Policy: Admins/Staff can manage vehicles (Insert/Update/Delete)
CREATE POLICY "manage_organization_vehicles" ON public.vehicles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM residents
            WHERE residents.id = vehicles.resident_id
            AND residents.condominium_id IN (
                 SELECT id FROM condominiums WHERE organization_id IN (
                    SELECT organization_id FROM organization_users 
                    WHERE user_id = auth.uid() 
                    AND role IN ('owner', 'admin', 'staff')
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM residents
            WHERE residents.id = vehicles.resident_id
            AND residents.condominium_id IN (
                 SELECT id FROM condominiums WHERE organization_id IN (
                    SELECT organization_id FROM organization_users 
                    WHERE user_id = auth.uid() 
                    AND role IN ('owner', 'admin', 'staff')
                )
            )
        )
    );
