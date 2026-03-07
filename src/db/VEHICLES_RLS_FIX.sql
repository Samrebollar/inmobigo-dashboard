-- FIX VEHICLES RLS (Ensure Visibility)
-- This script updates the vehicles table policies to match the new safe RLS strategy.

BEGIN;

-- 1. Ensure 'vehicles' table exists (Safety check)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    plate TEXT NOT NULL,
    brand TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 3. Helper Function Refresher (Just in case, though FIX_ALL_RLS should have created it)
-- We rely on: can_access_condominium(condo_id)

-- 4. Clean up old policies
DROP POLICY IF EXISTS "Enable access for users of the same organization" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_isolation_policy" ON public.vehicles;

-- 5. Apply NEW Safe Policy
-- Users can see/manage vehicles if they can access the Resident's Condominium.
CREATE POLICY "vehicle_access_policy" ON public.vehicles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.residents r
            WHERE r.id = vehicles.resident_id
            AND can_access_condominium(r.condominium_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.residents r
            WHERE r.id = vehicles.resident_id
            AND can_access_condominium(r.condominium_id)
        )
    );

COMMIT;
